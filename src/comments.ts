/**
 * comments.ts
 * Scrapes YouTube video comments using InnerTube endpoints and HTML scraping.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments).
 */

import { getInnerTubeConfig, getSapisidFromCookie, getSApiSidHash } from './scraper.js';
import type { InnerTubeConfig } from './scraper.js';

export interface CommentEntry {
    author: string;
    text: string;
    publishedTime: string;
    likeCount: number;
    commentId: string;
}

export interface CommentsApiRequestOptions {
    headers: Record<string, string>;
    body: string;
}

// Helper function to resolve nested paths in JSON objects
function findValue(obj: any, path: string, defaultValue: any = undefined): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || typeof current !== 'object' || !(part in current)) {
            return defaultValue;
        }
        current = current[part];
    }
    return current;
}

/**
 * Creates options for the InnerTube /next API call to fetch comments.
 * @param continuationToken - Continuation token for the next page of comments.
 * @param clientVersion - YouTube client version.
 * @returns Options with headers and stringified body.
 */
export function createCommentsApiRequestOptions(
    continuationToken: string,
    clientVersion: string = '2.20240703.00.00'
): CommentsApiRequestOptions {
    return {
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
            context: {
                client: {
                    clientName: "WEB",
                    clientVersion: clientVersion,
                },
            },
            continuation: continuationToken,
        }),
    };
}

/**
 * Fetches comment list for a YouTube video, paginating with continuation tokens.
 * @param videoId - The YouTube Video ID.
 * @param count - Number of comments to retrieve.
 * @param injectedConfig - InnerTube config parameters.
 * @returns Scraped comments.
 */
export async function fetchCommentsFromYouTube(
    videoId: string,
    count: number = 50,
    injectedConfig: Partial<InnerTubeConfig> | null = null
): Promise<CommentEntry[]> {
    let comments: CommentEntry[] = [];
    let continuationToken: string | null = null;
    let fetchedCount = 0;

    const config = await getInnerTubeConfig(injectedConfig);
    const apiKey = config.apiKey;
    const clientVersion = config.clientVersion || '2.20240703.00.00';

    try {
        // Step 1: Fetch the video page HTML to scrape the initial comment continuation token
        console.log(`[Comments] Fetching video page for ID: ${videoId}`);
        const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const pageResponse = await fetch(videoPageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const pageHtml = await pageResponse.text();

        const patterns = [
            /var ytInitialData\s*=\s*(\{.*?\});<\/script>/,
            /window\["ytInitialData"\]\s*=\s*(\{.*?\});/,
            /ytInitialData\s*=\s*(\{.*?\});/
        ];

        let ytInitialData: any = null;
        for (const regex of patterns) {
            const match = pageHtml.match(regex);
            if (match && match[1]) {
                ytInitialData = JSON.parse(match[1]);
                break;
            }
        }

        if (ytInitialData) {
            // 1. Scan contents.twoColumnWatchNextResults.results.results.contents for continuationItemRenderer or commentsEntryPointHeaderRenderer
            const contents = findValue(ytInitialData, 'contents.twoColumnWatchNextResults.results.results.contents');
            if (Array.isArray(contents)) {
                for (const item of contents) {
                    if (item.itemSectionRenderer) {
                        const sectionItems = item.itemSectionRenderer.contents || [];
                        for (const sItem of sectionItems) {
                            let token = findValue(sItem, 'continuationItemRenderer.continuationEndpoint.continuationCommand.token');
                            if (token) {
                                continuationToken = token;
                                break;
                            }
                            token = findValue(sItem, 'commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs.0.navigationEndpoint.continuationCommand.token');
                            if (token) {
                                continuationToken = token;
                                break;
                            }
                            token = findValue(sItem, 'commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.content.runs.0.navigationEndpoint.continuationCommand.token');
                            if (token) {
                                continuationToken = token;
                                break;
                            }
                        }
                    }
                    if (continuationToken) break;
                }
            }

            // 2. Scan engagementPanels (sidebar style layout)
            if (!continuationToken) {
                const panels = findValue(ytInitialData, 'engagementPanels');
                if (Array.isArray(panels)) {
                    for (const panel of panels) {
                        const token = findValue(panel, 'engagementPanelSectionListRenderer.content.sectionListRenderer.contents.0.itemSectionRenderer.contents.0.continuationItemRenderer.continuationEndpoint.continuationCommand.token');
                        if (token) {
                            continuationToken = token;
                            break;
                        }
                    }
                }
            }

            // 3. Fallback direct path checks if scanning failed
            if (!continuationToken) {
                continuationToken = findValue(
                    ytInitialData, 
                    'contents.twoColumnWatchNextResults.results.results.contents.2.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs.0.navigationEndpoint.continuationCommand.token'
                );
            }
            if (!continuationToken) {
                continuationToken = findValue(
                    ytInitialData,
                    'contents.twoColumnWatchNextResults.results.results.contents.2.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.content.runs.0.navigationEndpoint.continuationCommand.token'
                );
            }
            if (!continuationToken) {
                continuationToken = findValue(ytInitialData, 'contents.twoColumnWatchNextResults.results.results.contents.3.itemSectionRenderer.contents.0.commentsEntryPointHeaderRenderer.content.commentsEntryPointHeaderRenderer.simpleText.runs.0.navigationEndpoint.continuationCommand.token');
            }
        }

        if (!continuationToken) {
            console.error(`[Comments] Failed to extract comments continuation token for video ${videoId}`);
            return [];
        }

        // Step 2: Fetch comments in batches using the continuation tokens
        while (continuationToken && fetchedCount < count) {
            console.log(`[Comments] Fetching comment batch, total comments so far: ${fetchedCount}`);
            
            const options = createCommentsApiRequestOptions(continuationToken, clientVersion);
            const headers = { ...options.headers };
            
            // Append SAPISID authentication if available
            const sapisid = getSapisidFromCookie();
            if (sapisid) {
                const authHash = await getSApiSidHash(sapisid);
                if (authHash) {
                    headers['Authorization'] = `SAPISIDHASH ${authHash}`;
                }
            }

            const url = apiKey 
                ? `https://www.youtube.com/youtubei/v1/next?key=${apiKey}&prettyPrint=false`
                : "https://www.youtube.com/youtubei/v1/next?prettyPrint=false";

            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: options.body,
                credentials: 'include'
            });

            if (!response.ok) {
                console.error(`[Comments] InnerTube request failed with status: ${response.status}`);
                break;
            }

            const apiResponse = await response.json();
            const newComments: CommentEntry[] = [];
            const mutations = findValue(apiResponse, 'frameworkUpdates.entityBatchUpdate.mutations', []);

            for (const mutation of mutations) {
                const payload = findValue(mutation, 'payload.commentEntityPayload');
                if (payload) {
                    // Try modern nested schema
                    let author = findValue(payload, 'author.displayName');
                    let text = findValue(payload, 'properties.content.content');
                    let publishedTime = findValue(payload, 'properties.publishedTime');
                    let commentId = findValue(payload, 'properties.commentId');
                    let likesRaw = findValue(payload, 'toolbar.likeCountNotliked') || findValue(payload, 'toolbar.likeCountLiked');
                    
                    // Fallback to legacy schema
                    if (!author) author = findValue(payload, 'authorText.simpleText') || 'Anonymous';
                    if (!text) {
                        const runs = findValue(payload, 'contentText.runs', []);
                        if (runs.length > 0) {
                            text = runs.map((r: any) => r.text).join('');
                        } else {
                            text = findValue(payload, 'contentText.simpleText', '');
                        }
                    }
                    if (!publishedTime) publishedTime = findValue(payload, 'publishedTimeText.simpleText', '');
                    if (!commentId) commentId = findValue(payload, 'commentId', '');
                    if (!likesRaw) likesRaw = findValue(payload, 'voteCount.simpleText', '0');

                    // Parse like count (handles format like "254K" or "1.2M" or integers)
                    let likeCount = 0;
                    if (likesRaw) {
                        const likesString = String(likesRaw).trim();
                        if (likesString.endsWith('K')) {
                            likeCount = Math.round(parseFloat(likesString.slice(0, -1)) * 1000);
                        } else if (likesString.endsWith('M')) {
                            likeCount = Math.round(parseFloat(likesString.slice(0, -1)) * 1000000);
                        } else {
                            likeCount = parseInt(likesString.replace(/\D/g, ''), 10) || 0;
                        }
                    }

                    if (text) {
                        newComments.push({ author, text, publishedTime, likeCount, commentId });
                    }
                }
            }

            comments = comments.concat(newComments);
            fetchedCount = comments.length;

            // Find next continuation token
            continuationToken = findValue(
                apiResponse, 
                'onResponseReceivedEndpoints.0.appendContinuationItemsAction.continuationItems.0.nextContinuationData.continuation'
            );
            
            if (!continuationToken) {
                continuationToken = findValue(
                    apiResponse, 
                    'onResponseReceivedEndpoints.0.reloadContinuationItemsCommand.continuationItems.0.nextContinuationData.continuation'
                );
            }
            
            if (!continuationToken && fetchedCount < count) {
                console.log(`[Comments] No more continuation tokens. Finished fetching.`);
                break;
            }
        }

        console.log(`[Comments] Successfully fetched ${comments.length} comments.`);
        return comments.slice(0, count);

    } catch (error) {
        console.error(`[Comments] Error fetching comments for ${videoId}:`, error);
        return [];
    }
}
