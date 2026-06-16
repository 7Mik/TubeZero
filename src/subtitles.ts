/**
 * subtitles.ts
 * Scrapes and parses subtitles/transcripts for a YouTube video.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments) and server-side.
 */

import { Client } from './client.js';
import type { ClientOptions } from './client.js';

export interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

interface CaptionTrackInfo {
    baseUrl: string;
    vssId?: string;
    languageCode: string;
    name: string;
    isTranslatable: boolean;
}

// Helper to resolve nested keys in JSON
function findValue(obj: any, path: string, fallback: any = null): any {
    return path.split('.').reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : fallback, obj);
}

// Extract ytInitialData object from HTML string
function extractYtInitialData(html: string): any {
    try {
        const match = html.match(/var ytInitialData = (.*?);<\/script>/);
        if (!match || !match[1]) {
            const fallbackMatch = html.match(/ytInitialData\s*=\s*({.+?});/);
            if (!fallbackMatch || !fallbackMatch[1]) {
                return null;
            }
            return JSON.parse(fallbackMatch[1]);
        }
        return JSON.parse(match[1]);
    } catch (e) {
        return null;
    }
}

// Recursively find player response containing captions tracklist in a nested object
function findPlayerResponseInObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return null;
    if (obj.captions?.playerCaptionsTracklistRenderer) return obj;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                const result = findPlayerResponseInObject(value);
                if (result) return result;
            }
        }
    }
    return null;
}

/**
 * Extracts the `ytInitialPlayerResponse` or captions tracklist from the video page HTML.
 * @param html - Raw HTML of the YouTube video watch page.
 * @returns The playerResponse object or null.
 */
export function extractPlayerResponse(html: string): any {
    let playerResponse: any = null;
    try {
        const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (playerResponseMatch && playerResponseMatch[1]) {
            playerResponse = JSON.parse(playerResponseMatch[1]);
            if (playerResponse && playerResponse.captions?.playerCaptionsTracklistRenderer) {
                return playerResponse;
            }
        }

        const windowResponseMatch = html.match(/window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/);
        if (windowResponseMatch && windowResponseMatch[1]) {
            playerResponse = JSON.parse(windowResponseMatch[1]);
            if (playerResponse && playerResponse.captions?.playerCaptionsTracklistRenderer) {
                return playerResponse;
            }
        }

        const ytInitialData = extractYtInitialData(html);
        if (ytInitialData) {
            const foundPlayerResponse = findPlayerResponseInObject(ytInitialData);
            if (foundPlayerResponse) return foundPlayerResponse;
        }
    } catch (e) {
        console.error("[Subtitles] Error extracting player response:", e);
    }
    return null;
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
            const code = parseInt(hex, 16);
            return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
        })
        .replace(/&#(\d+);/g, (_, dec) => {
            const code = parseInt(dec, 10);
            return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
        });
}

/**
 * Parses XML srv3/timedtext transcript format using regular expressions.
 * @param xmlText - The raw XML transcript response.
 * @returns Parsed transcript segments.
 */
export function parseXmlTranscriptRegex(xmlText: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>(.*?)<\/text>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xmlText)) !== null) {
        const start = parseFloat(match[1]);
        const duration = parseFloat(match[2]);
        let text = decodeHtmlEntities(match[3]).replace(/\n/g, ' ').trim();

        if (text && !isNaN(start)) {
            segments.push({ start, duration, text });
        }
    }
    return segments;
}

/**
 * Fetches and parses the subtitles/captions transcript for a video in the requested language.
 * Uses InnerTube API with Client profiles fallback, and json3 extraction for better stability.
 * @param videoId - The YouTube Video ID.
 * @param language - The desired language code (e.g. 'en', 'it', 'es').
 * @returns Array of transcript segments.
 */
export async function fetchSubtitlesFromYouTube(
    videoId: string, 
    language: string = 'en', 
    clientOrOptions?: Client | ClientOptions
): Promise<TranscriptSegment[]> {
    try {
        let client: Client;
        if (clientOrOptions instanceof Client) {
            client = clientOrOptions;
        } else {
            client = new Client(clientOrOptions);
        }

        const cacheKey = `yt_subtitles_${videoId}_${language}`;
        if (client.cache) {
            const cached = await client.cache.get(cacheKey);
            if (cached) return cached;
        }

        console.log(`[Subtitles] Fetching player data for video: ${videoId}`);
        
        let playerResponse: any = null;
        
        try {
            // Attempt to get player data using the robust fallback client profiles
            playerResponse = await client.requestPlayerWithFallback(videoId);
        } catch (apiError) {
            console.warn(`[Subtitles] InnerTube API failed for ${videoId}. Falling back to HTML scraping.`, apiError);
        }

        // Extreme fallback: Web Scraping if API completely fails or is blocked
        if (!playerResponse || !playerResponse.captions || !playerResponse.captions.playerCaptionsTracklistRenderer) {
            console.log(`[Subtitles] No captions in API response, trying HTML scraping fallback for ${videoId}`);
            const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999`;
            const response = await client.fetch(videoPageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US'
                }
            });
            const pageHtml = await response.text();
            playerResponse = extractPlayerResponse(pageHtml);
        }

        if (!playerResponse || !playerResponse.captions || !playerResponse.captions.playerCaptionsTracklistRenderer) {
            console.warn(`[Subtitles] No captions tracklist found for video: ${videoId}`);
            return [];
        }

        const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks || [];
        if (captionTracks.length === 0) {
            console.warn(`[Subtitles] Empty captionTracks array for video: ${videoId}`);
            return [];
        }

        // Map InnerTube format to clean structures
        const tracks: CaptionTrackInfo[] = captionTracks.map((t: any) => ({
            baseUrl: t.baseUrl,
            vssId: t.vssId,
            languageCode: t.languageCode,
            name: t.name?.simpleText || t.name,
            isTranslatable: t.kind === 'asr'
        }));

        let selectedTrack: CaptionTrackInfo | undefined;

        // 1. Match preferred language exactly (prioritizing manual over ASR)
        if (language && language !== 'auto') {
            const lowerLang = language.toLowerCase();
            selectedTrack = tracks.find((t) => t.vssId === `.${lowerLang}`) || 
                            tracks.find((t) => t.vssId === `a.${lowerLang}`) ||
                            tracks.find((t) => t.languageCode.toLowerCase() === lowerLang && !t.isTranslatable) ||
                            tracks.find((t) => t.languageCode.toLowerCase() === lowerLang) ||
                            tracks.find((t) => t.languageCode.toLowerCase().includes(lowerLang));
        }

        // 2. English fallback
        if (!selectedTrack) {
            selectedTrack = tracks.find((t) => t.languageCode.toLowerCase().startsWith('en') && !t.isTranslatable);
            if (!selectedTrack) selectedTrack = tracks.find((t) => t.languageCode.toLowerCase().startsWith('en'));
        }

        // 3. Fallback to the first available track
        if (!selectedTrack) {
            selectedTrack = tracks[0];
        }

        if (!selectedTrack) {
            console.warn("[Subtitles] No suitable caption track found");
            return [];
        }

        console.log(`[Subtitles] Selected track: ${selectedTrack.languageCode} (${selectedTrack.isTranslatable ? 'ASR/Auto' : 'Manual'})`);

        // Force JSON3 format to avoid brittle regex on XML
        let urlWithFormat = selectedTrack.baseUrl.replace(/&fmt=[^&]+/, '');
        urlWithFormat += '&fmt=json3';

        console.log(`[Subtitles] Fetching transcript from: ${urlWithFormat.substring(0, 100)}...`);
        const transcriptResponse = await client.fetch(urlWithFormat, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': 'https://www.youtube.com/',
                'Origin': 'https://www.youtube.com'
            }
        });
        
        const transcriptData = await transcriptResponse.text();
        let transcripts: TranscriptSegment[] = [];

        // Parse JSON3 format
        try {
            const json = JSON.parse(transcriptData);
            if (json.events) {
                transcripts = json.events.map((e: any) => {
                    if (!e) return null;
                    const rawText = (e.segs ? e.segs.map((s: any) => s?.utf8 || '').join('') : '');
                    // Clean HTML tags and decode entities
                    const cleanText = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).replace(/\n/g, ' ').trim();
                    return {
                        start: (e.tStartMs || 0) / 1000,
                        duration: (e.dDurationMs || 0) / 1000,
                        text: cleanText
                    };
                }).filter((s: any) => s && s.text);
            }
        } catch (jsonError) {
            console.warn("[Subtitles] Failed to parse transcript string as JSON3. Falling back to XML regex.", jsonError);
            
            // If json3 fails, attempt to fetch srv3 XML as ultimate fallback
            const xmlUrl = selectedTrack.baseUrl.replace(/&fmt=[^&]+/, '') + '&fmt=srv3';
            const xmlResponse = await client.fetch(xmlUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const xmlData = await xmlResponse.text();
            transcripts = parseXmlTranscriptRegex(xmlData);
        }

        if (client.cache && transcripts.length > 0) {
            await client.cache.set(cacheKey, transcripts);
        }

        console.log(`[Subtitles] Retrieved ${transcripts.length} segments.`);
        return transcripts;

    } catch (error) {
        console.error(`[Subtitles] Error fetching subtitles for video ${videoId}:`, error);
        return [];
    }
}
