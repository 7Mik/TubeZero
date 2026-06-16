/**
 * client.ts
 * Core InnerTube Client class for TubeVanilla.
 * Optimized for client-side environments with zero external dependencies.
 */

import { SearchResult } from './search-result.js';
import { Video } from './video.js';
import { Playlist } from './playlist.js';

export interface InnerTubeConfig {
    apiKey: string | null;
    clientVersion: string;
    idToken: string | null;
}

export interface Cache {
    get(key: string): Promise<any> | any;
    set(key: string, value: any): Promise<void> | void;
}

export interface ClientOptions {
    apiKey?: string | null;
    clientVersion?: string;
    idToken?: string | null;
    cookie?: string;
    fetch?: typeof globalThis.fetch;
    cache?: Cache;
}

export interface ClientProfile {
    name: string;
    clientName: string;
    clientVersion: string;
    clientNameHeader: string;
    userAgent: string;
    context: Record<string, any>;
}

export const CLIENT_PROFILES: ClientProfile[] = [
    {
        name: 'ios',
        clientName: 'IOS',
        clientVersion: '20.10.4',
        clientNameHeader: '5',
        userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)',
        context: {
            deviceMake: 'Apple',
            deviceModel: 'iPhone16,2',
            platform: 'MOBILE',
            osName: 'iOS',
            osVersion: '18.3.2.22D82',
        },
    },
    {
        name: 'android_vr',
        clientName: 'ANDROID_VR',
        clientVersion: '1.62.20',
        clientNameHeader: '28',
        userAgent: 'com.google.android.apps.youtube.vr.oculus/1.62.20 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
        context: {
            deviceMake: 'Oculus',
            deviceModel: 'Quest 3',
            platform: 'MOBILE',
            osName: 'Android',
            osVersion: '12L',
            androidSdkVersion: 32,
        },
    },
    {
        name: 'mweb',
        clientName: 'MWEB',
        clientVersion: '2.20251209.01.00',
        clientNameHeader: '2',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        context: {
            platform: 'MOBILE',
            osName: 'iOS',
            osVersion: '17.5.1',
        },
    }
];

export function getFallbackClientVersion(): string {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const yyyymmdd = d.toISOString().split('T')[0].replace(/-/g, '');
    return `2.${yyyymmdd}.00.00`;
}

export function getSapisidFromCookieString(cookieString?: string): string | null {
    if (!cookieString && typeof document !== 'undefined') {
        cookieString = document.cookie;
    }
    if (!cookieString) return null;
    const match = cookieString.match(/__Secure-3PAPISID=([^;]+)/) || 
                  cookieString.match(/__Secure-1PAPISID=([^;]+)/) ||
                  cookieString.match(/SAPISID=([^;]+)/);
    return match ? match[1] : null;
}

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
        console.error("[Client] Failed to generate SAPISIDHASH", e);
        return null;
    }
}

let cachedApiKey: string | null = null;
let cachedClientVersion: string | null = null;
let cachedIdToken: string | null = null;

export async function getInnerTubeConfig(injectedConfig?: Partial<InnerTubeConfig> | null, customFetch?: typeof globalThis.fetch): Promise<InnerTubeConfig> {
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
        const fetchFn = customFetch || (typeof globalThis !== 'undefined' ? globalThis.fetch : fetch);
        const response = await fetchFn('https://www.youtube.com', { credentials: 'include' });
        const html = await response.text();

        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
        const clientVersionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
        const idTokenMatch = html.match(/"ID_TOKEN":"([^"]+)"/);

        if (apiKeyMatch && apiKeyMatch[1]) cachedApiKey = apiKeyMatch[1];
        if (clientVersionMatch && clientVersionMatch[1]) cachedClientVersion = clientVersionMatch[1];
        if (idTokenMatch && idTokenMatch[1]) cachedIdToken = idTokenMatch[1];
    } catch (e) {
        console.warn("[Client] Failed to extract InnerTube config from HTML", e);
    }

    if (!cachedClientVersion) cachedClientVersion = getFallbackClientVersion();

    return { apiKey: cachedApiKey, clientVersion: cachedClientVersion, idToken: cachedIdToken };
}

export class Client {
    public apiKey: string | null = null;
    public clientVersion: string = '';
    public idToken: string | null = null;
    public cookie: string = '';
    public fetch: typeof globalThis.fetch;
    public cache?: Cache;

    constructor(options: ClientOptions = {}) {
        this.cookie = options.cookie !== undefined ? options.cookie : '';
        this.fetch = options.fetch || (typeof globalThis !== 'undefined' ? globalThis.fetch : fetch);
        this.cache = options.cache;

        let resolvedApiKey = options.apiKey !== undefined ? options.apiKey : null;
        let resolvedClientVersion = options.clientVersion !== undefined ? options.clientVersion : null;
        let resolvedIdToken = options.idToken !== undefined ? options.idToken : null;

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

    async ensureConfig(): Promise<void> {
        if (this.apiKey) return;
        const config = await getInnerTubeConfig(null, this.fetch);
        this.apiKey = config.apiKey;
        if (config.clientVersion) this.clientVersion = config.clientVersion;
        this.idToken = config.idToken;
    }

    /**
     * Standard InnerTube request using the WEB client (useful for authenticated endpoints).
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

        if (this.idToken) headers['X-Youtube-Identity-Token'] = this.idToken;

        const activeCookie = this.cookie || (typeof document !== 'undefined' ? document.cookie : '');
        if (activeCookie) {
            headers['Cookie'] = activeCookie;
            const sapisid = getSapisidFromCookieString(activeCookie);
            if (sapisid) {
                const authHash = await getSApiSidHash(sapisid, 'https://www.youtube.com');
                if (authHash) headers['Authorization'] = `SAPISIDHASH ${authHash}`;
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

        const cacheKey = `yt_request_${cleanEndpoint}_${JSON.stringify(bodyPayload)}`;
        if (this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) return cached;
        }

        const response = await this.fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`InnerTube request failed with status: ${response.status}`);
        }

        const data = await response.json();
        if (this.cache) {
            await this.cache.set(cacheKey, data);
        }
        return data;
    }

    /**
     * Specialized request for the /player endpoint that loops through client profiles
     * to bypass IP blocks or Captcha walls.
     */
    async requestPlayerWithFallback(videoId: string): Promise<any> {
        await this.ensureConfig();

        const cacheKey = `yt_player_fallback_${videoId}`;
        if (this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) return cached;
        }

        const url = `https://www.youtube.com/youtubei/v1/player?key=${this.apiKey}&prettyPrint=false`;
        let firstPlayable: any = null;
        const failures: string[] = [];

        for (const profile of CLIENT_PROFILES) {
            try {
                const body = {
                    videoId,
                    context: {
                        client: {
                            clientName: profile.clientName,
                            clientVersion: profile.clientVersion,
                            hl: 'en',
                            gl: 'US',
                            ...profile.context
                        },
                        user: { lockedSafetyMode: false },
                        request: { useSsl: true }
                    },
                    contentCheckOk: true,
                    racyCheckOk: true
                };

                const response = await this.fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': profile.userAgent,
                        'X-YouTube-Client-Name': profile.clientNameHeader,
                        'X-YouTube-Client-Version': profile.clientVersion,
                        'Origin': 'https://www.youtube.com'
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    failures.push(`${profile.name}: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                const status = data.playabilityStatus?.status;

                if (status && status !== 'OK') {
                    const reason = data.playabilityStatus?.reason;
                    failures.push(`${profile.name}: ${status}${reason ? ` - ${reason}` : ''}`);
                    continue;
                }

                if (!firstPlayable) firstPlayable = data;
                
                const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (tracks && tracks.length > 0) {
                    if (this.cache) await this.cache.set(cacheKey, data);
                    return data; // Found tracks!
                }
                
                failures.push(`${profile.name}: OK but no caption tracks`);
            } catch (err: any) {
                failures.push(`${profile.name}: ${err.message}`);
            }
        }

        if (firstPlayable) {
            if (this.cache) await this.cache.set(cacheKey, firstPlayable);
            return firstPlayable;
        }
        
        // If all fallbacks fail, fall back to standard WEB request
        console.warn(`[Client] All mobile profiles failed, falling back to WEB profile. Attempts:\n${failures.join('\n')}`);
        return this.request('player', { videoId, contentCheckOk: true, racyCheckOk: true });
    }

    async search(query: string, options?: { type?: 'video' | 'playlist' | 'channel' | 'all' }): Promise<SearchResult> {
        const payload: any = { query };
        if (options?.type === 'video') payload.params = 'EgIQAQ%3D%3D';
        else if (options?.type === 'playlist') payload.params = 'EgIQAw%3D%3D';
        else if (options?.type === 'channel') payload.params = 'EgIQAg%3D%3D';

        const data = await this.request('search', payload);
        return new SearchResult(this, data);
    }

    async getVideo(videoId: string): Promise<Video> {
        const [playerData, nextData] = await Promise.all([
            this.requestPlayerWithFallback(videoId),
            this.request('next', { videoId })
        ]);
        const merged = { ...playerData, ...nextData };
        return new Video(this, merged);
    }

    async getPlaylist(playlistId: string): Promise<Playlist> {
        const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;
        const data = await this.request('browse', { browseId });
        return new Playlist(this, data);
    }
}
