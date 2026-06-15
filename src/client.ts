/**
 * client.ts
 * Core InnerTube Client class for TubeVanilla.
 * Optimized for client-side environments with zero external dependencies.
 */

import { getInnerTubeConfig } from './scraper.js';
import type { InnerTubeConfig } from './scraper.js';
import { SearchResult } from './search-result.js';
import { Video } from './video.js';
import { Playlist } from './playlist.js';

export interface ClientOptions {
    apiKey?: string | null;
    clientVersion?: string;
    idToken?: string | null;
    cookie?: string;
}

function getFallbackClientVersion(): string {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const yyyymmdd = d.toISOString().split('T')[0].replace(/-/g, '');
    return `2.${yyyymmdd}.00.00`;
}

function getSapisidFromCookieString(cookieString: string): string | null {
    const match = cookieString.match(/__Secure-3PAPISID=([^;]+)/) || 
                  cookieString.match(/__Secure-1PAPISID=([^;]+)/) ||
                  cookieString.match(/SAPISID=([^;]+)/);
    return match ? match[1] : null;
}

async function getSApiSidHash(sapisid: string, origin: string = 'https://www.youtube.com'): Promise<string | null> {
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
        console.error("[Client] Failed to generate SAPISIDHASH", e);
        return null;
    }
}

export class Client {
    public apiKey: string | null = null;
    public clientVersion: string = '';
    public idToken: string | null = null;
    public cookie: string = '';

    constructor(options: ClientOptions = {}) {
        this.cookie = options.cookie !== undefined 
            ? options.cookie 
            : '';

        let resolvedApiKey = options.apiKey !== undefined ? options.apiKey : null;
        let resolvedClientVersion = options.clientVersion !== undefined ? options.clientVersion : null;
        let resolvedIdToken = options.idToken !== undefined ? options.idToken : null;

        // Inspect window.ytcfg if running in a browser page context
        if (typeof window !== 'undefined' && (window as any).ytcfg) {
            const ytcfg = (window as any).ytcfg;
            if (typeof ytcfg.get === 'function') {
                if (resolvedApiKey === null) resolvedApiKey = ytcfg.get('INNERTUBE_API_KEY') || null;
                if (resolvedClientVersion === null) resolvedClientVersion = ytcfg.get('INNERTUBE_CLIENT_VERSION') || null;
                if (resolvedIdToken === null) resolvedIdToken = ytcfg.get('ID_TOKEN') || null;
            } else {
                if (resolvedApiKey === null) resolvedApiKey = ytcfg.INNERTUBE_API_KEY || null;
                if (resolvedClientVersion === null) resolvedClientVersion = ytcfg.INNERTUBE_CLIENT_VERSION || null;
                if (resolvedIdToken === null) resolvedIdToken = ytcfg.ID_TOKEN || null;
            }
        }

        this.apiKey = resolvedApiKey;
        this.clientVersion = resolvedClientVersion || getFallbackClientVersion();
        this.idToken = resolvedIdToken;
    }

    /**
     * Asynchronously resolves config parameters if apiKey is not set yet.
     * Fetches and parses YouTube's home page HTML using the scraper logic.
     */
    async ensureConfig(): Promise<void> {
        if (this.apiKey) {
            return;
        }
        const config = await getInnerTubeConfig();
        this.apiKey = config.apiKey;
        if (config.clientVersion) {
            this.clientVersion = config.clientVersion;
        }
        this.idToken = config.idToken;
    }

    /**
     * Dispatches an authenticated or unauthenticated POST request to the specified InnerTube endpoint.
     */
    async request(endpoint: string, payload: any): Promise<any> {
        await this.ensureConfig();

        if (!this.apiKey) {
            throw new Error("[Client] InnerTube API key is not configured.");
        }

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const url = `https://www.youtube.com/youtubei/v1/${cleanEndpoint}?key=${this.apiKey}&prettyPrint=false`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Youtube-Client-Name': '1',
            'X-Youtube-Client-Version': this.clientVersion,
        };

        if (this.idToken) {
            headers['X-Youtube-Identity-Token'] = this.idToken;
        }

        const activeCookie = this.cookie || (typeof document !== 'undefined' ? document.cookie : '');
        if (activeCookie) {
            headers['Cookie'] = activeCookie;
            const sapisid = getSapisidFromCookieString(activeCookie);
            if (sapisid) {
                const authHash = await getSApiSidHash(sapisid, 'https://www.youtube.com');
                if (authHash) {
                    headers['Authorization'] = `SAPISIDHASH ${authHash}`;
                }
            }
        }

        const bodyPayload = (payload && typeof payload === 'object') ? payload : {};
        const requestBody = {
            ...bodyPayload,
            context: {
                ...bodyPayload.context,
                client: {
                    clientName: 'WEB',
                    clientVersion: this.clientVersion,
                    hl: 'en',
                    gl: 'US',
                    ...bodyPayload.context?.client
                }
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`InnerTube request failed with status: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Searches YouTube for the given query.
     */
    async search(query: string, options?: { type?: 'video' | 'playlist' | 'channel' | 'all' }): Promise<SearchResult> {
        const payload: any = { query };
        if (options?.type === 'video') {
            payload.params = 'EgIQAQ%3D%3D'; // Static base64 for video type
        } else if (options?.type === 'playlist') {
            payload.params = 'EgIQAw%3D%3D'; // Static base64 for playlist type
        } else if (options?.type === 'channel') {
            payload.params = 'EgIQAg%3D%3D'; // Static base64 for channel type
        }

        const data = await this.request('search', payload);
        return new SearchResult(this, data);
    }

    /**
     * Gets metadata for a specific video.
     */
    async getVideo(videoId: string): Promise<Video> {
        // Fetch both player and next endpoints to get complete metadata
        const [playerData, nextData] = await Promise.all([
            this.request('player', { videoId }),
            this.request('next', { videoId })
        ]);
        
        // Merge to provide all details to the Video class
        const merged = { ...playerData, ...nextData };
        return new Video(this, merged);
    }

    /**
     * Gets metadata and videos for a specific playlist.
     */
    async getPlaylist(playlistId: string): Promise<Playlist> {
        const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;
        const data = await this.request('browse', { browseId });
        return new Playlist(this, data);
    }
}
