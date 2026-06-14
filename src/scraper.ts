/**
 * scraper.ts
 * Scrapes user-specific YouTube feeds: History, Likes, Watch Later, and Custom Playlists.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments).
 */

export interface VideoEntry {
    title: string;
    channel: string;
}

export interface InnerTubeConfig {
    apiKey: string | null;
    clientVersion: string;
    idToken: string | null;
}

export interface CustomPlaylist {
    url: string;
}

export interface CustomPlaylistData {
    id: string;
    entries: VideoEntry[];
}

export interface TasteData {
    historyEntries: VideoEntry[];
    likesEntries: VideoEntry[];
    wlEntries: VideoEntry[];
    dislikesEntries: VideoEntry[];
    customPlaylistsData: CustomPlaylistData[];
}

/**
 * Fetches the HTML of a YouTube page and extracts `ytInitialData`.
 * @param url - The URL to fetch.
 * @returns The parsed ytInitialData object or null.
 */
export async function fetchYtInitialData(url: string): Promise<any> {
    try {
        console.log(`[Scraper] Fetching HTML from ${url}`);
        const response = await fetch(url, { credentials: 'include' });
        const text = await response.text();
        
        const patterns = [
            /var ytInitialData\s*=\s*(\{.*?\});<\/script>/,
            /window\["ytInitialData"\]\s*=\s*(\{.*?\});/
        ];
        
        for (const regex of patterns) {
            const match = text.match(regex);
            if (match && match[1]) {
                return JSON.parse(match[1]);
            }
        }
        console.warn(`[Scraper] Could not find ytInitialData in ${url}`);
    } catch (e) {
        console.error(`[Scraper] Failed to fetch data from ${url}`, e);
    }
    return null;
}

/**
 * Reads SAPISID cookies from the browser environment.
 * Only works if running on a youtube.com domain or in an extension with cookie access.
 * @returns The SAPISID value or null.
 */
export function getSapisidFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/__Secure-3PAPISID=([^;]+)/) || 
                  document.cookie.match(/__Secure-1PAPISID=([^;]+)/) ||
                  document.cookie.match(/SAPISID=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Generates the SAPISIDHASH Authorization header value needed for authenticated InnerTube requests.
 * @param sapisid - The SAPISID cookie value.
 * @param origin - The request origin.
 * @returns The generated authorization hash or null.
 */
export async function getSApiSidHash(sapisid: string, origin: string = 'https://www.youtube.com'): Promise<string | null> {
    if (!sapisid) return null;
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const input = `${timestamp} ${sapisid} ${origin}`;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const buffer = await crypto.subtle.digest('SHA-1', data);
        
        const hash = Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
            
        return `${timestamp}_${hash}`;
    } catch (e) {
        console.error("[Scraper] Failed to generate SAPISIDHASH", e);
        return null;
    }
}

/**
 * Recursively scans a JSON object to extract video entries { title, channel }.
 * Handles both the legacy videoRenderer and the newer lockupViewModel schemas.
 * @param data - The JSON object to search.
 * @returns Array of extracted video entries.
 */
export function extractVideoEntries(data: any): VideoEntry[] {
    const entries: VideoEntry[] = [];
    const seenTitles = new Set<string>();

    function recurse(obj: any): void {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                recurse(obj[i]);
            }
            return;
        }

        // 1. Legacy Schema (Shorts, older items)
        if (obj.videoId && obj.title) {
            let title = '';
            if (typeof obj.title === 'string') {
                title = obj.title;
            } else if (obj.title.runs && obj.title.runs[0] && obj.title.runs[0].text) {
                title = obj.title.runs[0].text;
            } else if (obj.title.simpleText) {
                title = obj.title.simpleText;
            }

            title = title.trim();

            if (title && title.length > 2 && title !== "Skip navigation") {
                if (!seenTitles.has(title)) {
                    seenTitles.add(title);

                    let channel = '';
                    const byline = obj.longBylineText || obj.shortBylineText || obj.ownerText;
                    if (byline) {
                        if (typeof byline === 'string') {
                            channel = byline;
                        } else if (byline.runs && byline.runs[0] && byline.runs[0].text) {
                            channel = byline.runs[0].text;
                        } else if (byline.simpleText) {
                            channel = byline.simpleText;
                        }
                    }

                    entries.push({
                        title: title,
                        channel: channel.split('\n')[0].replace(/•/g, '').trim()
                    });
                }
            }
            return;
        }
        
        // 2. Modern lockupViewModel Schema (Standard videos)
        if (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
            const model = obj.lockupViewModel;
            const meta = model.metadata?.lockupMetadataViewModel;
            if (meta && meta.title && meta.title.content) {
                const title = (meta.title.content as string).trim();
                if (title && !seenTitles.has(title)) {
                    seenTitles.add(title);
                    
                    let channel = '';
                    const rows = meta.metadata?.contentMetadataViewModel?.metadataRows;
                    if (rows && rows[0] && rows[0].metadataParts && rows[0].metadataParts[0] && rows[0].metadataParts[0].text) {
                        channel = rows[0].metadataParts[0].text.content || '';
                    }
                    
                    entries.push({
                        title: title,
                        channel: channel.split('\n')[0].replace(/•/g, '').trim()
                    });
                }
            }
            return;
        }

        // Recurse down
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                recurse(obj[key]);
            }
        }
    }

    try {
        recurse(data);
    } catch (e) {
        console.warn("[Scraper] Error extracting video entries recursively", e);
    }

    return entries;
}

function getFallbackClientVersion(): string {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const yyyymmdd = d.toISOString().split('T')[0].replace(/-/g, '');
    return `2.${yyyymmdd}.00.00`;
}

let cachedApiKey: string | null = null;
let cachedClientVersion: string | null = null;
let cachedIdToken: string | null = null;

/**
 * Extracts InnerTube credentials and configuration parameters by parsing the YouTube home page.
 * @param injectedConfig - Pre-fetched config if available (bypasses fetching).
 * @returns InnerTube config parameters.
 */
export async function getInnerTubeConfig(injectedConfig?: Partial<InnerTubeConfig> | null): Promise<InnerTubeConfig> {
    if (injectedConfig && injectedConfig.apiKey) {
        cachedApiKey = injectedConfig.apiKey;
        cachedClientVersion = injectedConfig.clientVersion || getFallbackClientVersion();
        cachedIdToken = injectedConfig.idToken ?? null;
        return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
    }

    if (cachedApiKey && cachedClientVersion) {
        return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
    }

    try {
        console.log("[Scraper] Fetching YouTube homepage for config...");
        const response = await fetch('https://www.youtube.com', { credentials: 'include' });
        const html = await response.text();

        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
        const clientVersionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
        const idTokenMatch = html.match(/"ID_TOKEN":"([^"]+)"/);

        if (apiKeyMatch && apiKeyMatch[1]) cachedApiKey = apiKeyMatch[1];
        if (clientVersionMatch && clientVersionMatch[1]) cachedClientVersion = clientVersionMatch[1];
        if (idTokenMatch && idTokenMatch[1]) cachedIdToken = idTokenMatch[1];

        console.log(`[Scraper] Extracted Config — Key: ${cachedApiKey ? 'OK' : 'Failed'}, Version: ${cachedClientVersion}`);
    } catch (e) {
        console.warn("[Scraper] Failed to extract InnerTube config from HTML", e);
    }

    if (!cachedClientVersion) {
        cachedClientVersion = getFallbackClientVersion();
    }

    return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
}

/**
 * Recursively searches for the continuation token in an InnerTube response.
 * @param obj - InnerTube response subtree.
 * @returns The token or null.
 */
export function findContinuationToken(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return null;

    if (obj.continuationCommand && obj.continuationCommand.token) {
        return obj.continuationCommand.token as string;
    }

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const token = findContinuationToken(obj[key]);
            if (token) return token;
        }
    }
    return null;
}

/**
 * Paginate InnerTube feeds using continuation tokens.
 */
async function fetchInnerTubeContinuation(
    apiKey: string,
    clientVersion: string,
    idToken: string | null,
    initialToken: string,
    limit: number
): Promise<VideoEntry[]> {
    const entries: VideoEntry[] = [];
    let continuationToken: string | null = initialToken;

    try {
        while (continuationToken && entries.length < limit) {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Youtube-Client-Name': '1',
                'X-Youtube-Client-Version': clientVersion
            };
            if (idToken) {
                headers['X-Youtube-Identity-Token'] = idToken;
            }
            const sapisid = getSapisidFromCookie();
            if (sapisid) {
                const authHash = await getSApiSidHash(sapisid, 'https://www.youtube.com');
                if (authHash) {
                    headers['Authorization'] = `SAPISIDHASH ${authHash}`;
                }
            }
            const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                    context: {
                        client: {
                            clientName: 'WEB',
                            clientVersion: clientVersion,
                            hl: 'en',
                            gl: 'US'
                        }
                    },
                    continuation: continuationToken
                })
            });

            if (!response.ok) break;

            const data = await response.json();
            const pageEntries = extractVideoEntries(data);
            entries.push(...pageEntries);

            continuationToken = findContinuationToken(data);
        }
    } catch (e) {
        console.error("[Scraper] Error in InnerTube pagination", e);
    }

    return entries;
}

/**
 * Fetches video list from a specific InnerTube browse ID, paginating if needed.
 * @param apiKey - InnerTube API Key.
 * @param clientVersion - InnerTube client version string.
 * @param idToken - Identity Token.
 * @param browseId - Target feed ID (e.g. 'FEhistory', 'VLLL', 'VLWL').
 * @param limit - Maximum entries to fetch.
 * @returns Array of videos.
 */
export async function fetchInnerTubeFeed(
    apiKey: string,
    clientVersion: string,
    idToken: string | null,
    browseId: string,
    limit: number = 500
): Promise<VideoEntry[]> {
    const entries: VideoEntry[] = [];
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Youtube-Client-Name': '1',
            'X-Youtube-Client-Version': clientVersion
        };
        if (idToken) {
            headers['X-Youtube-Identity-Token'] = idToken;
        }
        const sapisid = getSapisidFromCookie();
        if (sapisid) {
            const authHash = await getSApiSidHash(sapisid, 'https://www.youtube.com');
            if (authHash) {
                headers['Authorization'] = `SAPISIDHASH ${authHash}`;
            }
        }
        const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: clientVersion,
                        hl: 'en',
                        gl: 'US'
                    }
                },
                browseId: browseId
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        const pageEntries = extractVideoEntries(data);
        entries.push(...pageEntries);

        if (entries.length < limit) {
            const continuationToken = findContinuationToken(data);
            if (continuationToken) {
                const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, continuationToken, limit - entries.length);
                entries.push(...more);
            }
        }
    } catch (e) {
        console.error(`[Scraper] InnerTube fetch error for ${browseId}`, e);
    }

    return entries;
}

/**
 * Scrapes History, Liked videos, Watch Later, and any custom playlists.
 * Tries the InnerTube JSON API first, then falls back to HTML-scraping + paginating if needed.
 * @param injectedConfig - Preconfigured InnerTube parameters.
 * @param customPlaylists - Custom playlist definitions with URLs/IDs.
 * @param limit - Maximum items to retrieve per feed.
 * @returns Scraped feeds.
 */
export async function scrapeTasteData(
    injectedConfig?: Partial<InnerTubeConfig> | null,
    customPlaylists: CustomPlaylist[] = [],
    limit: number = 500
): Promise<TasteData> {
    let historyEntries: VideoEntry[] = [];
    let likesEntries: VideoEntry[] = [];
    let wlEntries: VideoEntry[] = [];
    const dislikesEntries: VideoEntry[] = []; // Populated externally

    const config = await getInnerTubeConfig(injectedConfig);
    const apiKey = config.apiKey;
    const clientVersion = config.clientVersion;
    const idToken = config.idToken;

    if (apiKey) {
        historyEntries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, 'FEhistory', limit);
        likesEntries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, 'VLLL', limit);
        wlEntries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, 'VLWL', limit);
    }

    // HTML Fallbacks
    if (historyEntries.length === 0) {
        const historyData = await fetchYtInitialData('https://www.youtube.com/feed/history');
        if (historyData) {
            historyEntries = extractVideoEntries(historyData);
            if (historyEntries.length < limit) {
                const token = findContinuationToken(historyData);
                if (token && apiKey) {
                    const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - historyEntries.length);
                    historyEntries.push(...more);
                }
            }
        }
    }
    
    if (likesEntries.length === 0) {
        const likesData = await fetchYtInitialData('https://www.youtube.com/playlist?list=LL');
        if (likesData) {
            likesEntries = extractVideoEntries(likesData);
            if (likesEntries.length < limit) {
                const token = findContinuationToken(likesData);
                if (token && apiKey) {
                    const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - likesEntries.length);
                    likesEntries.push(...more);
                }
            }
        }
    }
    
    if (wlEntries.length === 0) {
        const wlData = await fetchYtInitialData('https://www.youtube.com/playlist?list=WL');
        if (wlData) {
            wlEntries = extractVideoEntries(wlData);
            if (wlEntries.length < limit) {
                const token = findContinuationToken(wlData);
                if (token && apiKey) {
                    const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - wlEntries.length);
                    wlEntries.push(...more);
                }
            }
        }
    }

    // Custom Playlists Scrape
    const customPlaylistsData: CustomPlaylistData[] = [];
    for (const pl of customPlaylists) {
        if (!pl.url) continue;
        const match = pl.url.match(/[&?]list=([a-zA-Z0-9_-]+)/);
        const playlistId = match ? match[1] : pl.url.trim();
        if (!playlistId || !/^[a-zA-Z0-9_-]+$/.test(playlistId)) continue;

        const browseId = playlistId.startsWith('VL') ? playlistId : 'VL' + playlistId;
        let entries: VideoEntry[] = [];
        
        if (apiKey) {
            entries = await fetchInnerTubeFeed(apiKey, clientVersion, idToken, browseId, limit);
        }
        
        if (entries.length === 0) {
            const data = await fetchYtInitialData(`https://www.youtube.com/playlist?list=${playlistId}`);
            if (data) {
                entries = extractVideoEntries(data);
                if (entries.length < limit) {
                    const token = findContinuationToken(data);
                    if (token && apiKey) {
                        const more = await fetchInnerTubeContinuation(apiKey, clientVersion, idToken, token, limit - entries.length);
                        entries.push(...more);
                    }
                }
            }
        }
        
        customPlaylistsData.push({
            id: playlistId,
            entries: entries.slice(0, limit)
        });
    }

    return {
        historyEntries: historyEntries.slice(0, limit),
        likesEntries: likesEntries.slice(0, limit),
        wlEntries: wlEntries.slice(0, limit),
        dislikesEntries: dislikesEntries.slice(0, limit),
        customPlaylistsData
    };
}
