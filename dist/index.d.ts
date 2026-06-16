declare class Base {
    client: Client;
    constructor(client: Client);
}

declare abstract class Continuable<T> extends Base {
    items: T[];
    continuation?: string | null;
    private iteratorIndex;
    protected abstract fetch(): Promise<{
        items: T[];
        continuation?: string | null;
    }>;
    next(count?: number): Promise<T[]>;
}

interface Thumbnail {
    url: string;
    width: number;
    height: number;
}
declare class Thumbnails {
    list: Thumbnail[];
    constructor(list: Thumbnail[]);
    getBestResolution(): Thumbnail | undefined;
}

interface ChannelInfo {
    id?: string;
    name: string;
    thumbnails?: Thumbnails;
}
declare class VideoCompact extends Base {
    id: string;
    title: string;
    thumbnails: Thumbnails;
    duration: number | null;
    isLive: boolean;
    channel?: ChannelInfo;
    viewCount: number | null;
    publishedAt: string | null;
    constructor(client: Client, data: any);
    private parseDuration;
    private parseViewCount;
}

declare class PlaylistCompact extends Base {
    id: string;
    title: string;
    thumbnails: Thumbnails;
    videoCount: number | null;
    channel?: ChannelInfo;
    constructor(client: Client, data: any);
}

declare class ChannelCompact extends Base {
    id: string;
    name: string;
    thumbnails: Thumbnails;
    subscriberCount: string | null;
    constructor(client: Client, data: any);
}

type SearchItem = VideoCompact | PlaylistCompact | ChannelCompact;
declare class SearchResult extends Continuable<SearchItem> {
    constructor(client: Client, initialData: any);
    protected fetch(): Promise<{
        items: SearchItem[];
        continuation?: string | null;
    }>;
    private static parseData;
}

interface Format {
    itag: number;
    url: string;
    mimeType: string;
    bitrate: number;
    width?: number;
    height?: number;
    hasVideo: boolean;
    hasAudio: boolean;
    isLive: boolean;
    contentLength?: string;
    quality?: string;
    qualityLabel?: string;
    audioQuality?: string;
    approxDurationMs?: string;
}
interface StreamingData {
    expiresInSeconds: string;
    formats: Format[];
    adaptiveFormats: Format[];
}
declare class BaseVideo extends Base {
    id: string;
    title: string;
    description: string;
    thumbnails: Thumbnails;
    viewCount: number | null;
    publishDate: string | null;
    channel?: ChannelInfo;
    isLive: boolean;
    streamingData?: StreamingData;
    constructor(client: Client, data: any);
    protected parse(data: any): void;
}

declare class Video extends BaseVideo {
    constructor(client: Client, data: any);
}

declare class PlaylistVideos extends Continuable<VideoCompact> {
    constructor(client: Client, initialData: any);
    protected fetch(): Promise<{
        items: VideoCompact[];
        continuation?: string | null;
    }>;
    private static parseData;
}
declare class Playlist extends Base {
    id: string;
    title: string;
    videoCount: number;
    viewCount: number;
    lastUpdated: string;
    channel?: ChannelInfo;
    videos: PlaylistVideos;
    constructor(client: Client, data: any);
    private parse;
}

/**
 * client.ts
 * Core InnerTube Client class for TubeVanilla.
 * Optimized for client-side environments with zero external dependencies.
 */

interface InnerTubeConfig {
    apiKey: string | null;
    clientVersion: string;
    idToken: string | null;
}
interface Cache {
    get(key: string): Promise<any> | any;
    set(key: string, value: any): Promise<void> | void;
}
interface ClientOptions {
    apiKey?: string | null;
    clientVersion?: string;
    idToken?: string | null;
    cookie?: string;
    fetch?: typeof globalThis.fetch;
    cache?: Cache;
}
interface ClientProfile {
    name: string;
    clientName: string;
    clientVersion: string;
    clientNameHeader: string;
    userAgent: string;
    context: Record<string, any>;
}
declare function getSapisidFromCookieString(cookieString?: string): string | null;
declare function getSApiSidHash(sapisid: string, origin?: string): Promise<string | null>;
declare function getInnerTubeConfig(injectedConfig?: Partial<InnerTubeConfig> | null, customFetch?: typeof globalThis.fetch): Promise<InnerTubeConfig>;
declare class Client {
    apiKey: string | null;
    clientVersion: string;
    idToken: string | null;
    cookie: string;
    fetch: typeof globalThis.fetch;
    cache?: Cache;
    constructor(options?: ClientOptions);
    ensureConfig(): Promise<void>;
    /**
     * Standard InnerTube request using the WEB client (useful for authenticated endpoints).
     */
    request(endpoint: string, payload: any): Promise<any>;
    /**
     * Specialized request for the /player endpoint that loops through client profiles
     * to bypass IP blocks or Captcha walls.
     */
    requestPlayerWithFallback(videoId: string): Promise<any>;
    search(query: string, options?: {
        type?: 'video' | 'playlist' | 'channel' | 'all';
    }): Promise<SearchResult>;
    getVideo(videoId: string): Promise<Video>;
    getPlaylist(playlistId: string): Promise<Playlist>;
}

/**
 * scraper.ts
 * Scrapes user-specific YouTube feeds: History, Likes, Watch Later, and Custom Playlists.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments).
 */
interface VideoEntry {
    title: string;
    channel: string;
}
interface CustomPlaylist {
    url: string;
}

interface CustomPlaylistData {
    id: string;
    entries: VideoEntry[];
}
interface TasteData {
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
declare function fetchYtInitialData(url: string): Promise<any>;
/**
 * Recursively scans a JSON object to extract video entries { title, channel }.
 * Handles both the legacy videoRenderer and the newer lockupViewModel schemas.
 * @param data - The JSON object to search.
 * @returns Array of extracted video entries.
 */
declare function extractVideoEntries(data: any): VideoEntry[];

/**
 * Recursively searches for the continuation token in an InnerTube response.
 * @param obj - InnerTube response subtree.
 * @returns The token or null.
 */
declare function findContinuationToken(obj: any): string | null;
/**
 * Fetches video list from a specific InnerTube browse ID, paginating if needed.
 * @param apiKey - InnerTube API Key.
 * @param clientVersion - InnerTube client version string.
 * @param idToken - Identity Token.
 * @param browseId - Target feed ID (e.g. 'FEhistory', 'VLLL', 'VLWL').
 * @param limit - Maximum entries to fetch.
 * @returns Array of videos.
 */
declare function fetchInnerTubeFeed(apiKey: string, clientVersion: string, idToken: string | null, browseId: string, limit?: number): Promise<VideoEntry[]>;
/**
 * Scrapes History, Liked videos, Watch Later, and any custom playlists.
 * Tries the InnerTube JSON API first, then falls back to HTML-scraping + paginating if needed.
 * @param injectedConfig - Preconfigured InnerTube parameters.
 * @param customPlaylists - Custom playlist definitions with URLs/IDs.
 * @param limit - Maximum items to retrieve per feed.
 * @returns Scraped feeds.
 */
declare function scrapeTasteData(injectedConfig?: Partial<InnerTubeConfig> | null, customPlaylists?: CustomPlaylist[], limit?: number): Promise<TasteData>;

/**
 * subtitles.ts
 * Scrapes and parses subtitles/transcripts for a YouTube video.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments) and server-side.
 */

interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}
/**
 * Extracts the `ytInitialPlayerResponse` or captions tracklist from the video page HTML.
 * @param html - Raw HTML of the YouTube video watch page.
 * @returns The playerResponse object or null.
 */
declare function extractPlayerResponse(html: string): any;
/**
 * Parses XML srv3/timedtext transcript format using regular expressions.
 * @param xmlText - The raw XML transcript response.
 * @returns Parsed transcript segments.
 */
declare function parseXmlTranscriptRegex(xmlText: string): TranscriptSegment[];
/**
 * Fetches and parses the subtitles/captions transcript for a video in the requested language.
 * Uses InnerTube API with Client profiles fallback, and json3 extraction for better stability.
 * @param videoId - The YouTube Video ID.
 * @param language - The desired language code (e.g. 'en', 'it', 'es').
 * @returns Array of transcript segments.
 */
declare function fetchSubtitlesFromYouTube(videoId: string, language?: string, clientOrOptions?: Client | ClientOptions): Promise<TranscriptSegment[]>;

/**
 * Convert transcript segments to SubRip (SRT) format.
 *
 * @param segments - Array of transcript segments.
 * @returns A string in SRT format with sequence numbers and `HH:MM:SS,mmm` timestamps.
 */
declare function toSRT(segments: TranscriptSegment[]): string;
/**
 * Convert transcript segments to WebVTT (VTT) format.
 *
 * @param segments - Array of transcript segments.
 * @returns A string in VTT format with `WEBVTT` header and `HH:MM:SS.mmm` timestamps.
 */
declare function toVTT(segments: TranscriptSegment[]): string;
/**
 * Convert transcript segments to plain text.
 *
 * @param segments - Array of transcript segments.
 * @param separator - String to join segments with. Defaults to `'\n'`.
 * @returns A plain text string with segments joined by the separator.
 */
declare function toPlainText(segments: TranscriptSegment[], separator?: string): string;

/**
 * comments.ts
 * Scrapes YouTube video comments using InnerTube endpoints and HTML scraping.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments).
 */

interface CommentEntry {
    author: string;
    text: string;
    publishedTime: string;
    likeCount: number;
    commentId: string;
}
interface CommentsApiRequestOptions {
    headers: Record<string, string>;
    body: string;
}
/**
 * Creates options for the InnerTube /next API call to fetch comments.
 * @param continuationToken - Continuation token for the next page of comments.
 * @param clientVersion - YouTube client version.
 * @returns Options with headers and stringified body.
 */
declare function createCommentsApiRequestOptions(continuationToken: string, clientVersion?: string): CommentsApiRequestOptions;
/**
 * Fetches comment list for a YouTube video, paginating with continuation tokens.
 * @param videoId - The YouTube Video ID.
 * @param count - Number of comments to retrieve.
 * @param injectedConfig - InnerTube config parameters.
 * @returns Scraped comments.
 */
declare function fetchCommentsFromYouTube(videoId: string, count?: number, injectedConfig?: Partial<InnerTubeConfig> | null): Promise<CommentEntry[]>;

/**
 * Convenience helper to search YouTube without initializing a Client manually.
 * @param query The search query string.
 * @param options ClientOptions & Search filtering options.
 * @returns SearchResult object with video/playlist/channel items.
 */
declare function searchYouTube(query: string, options?: {
    type?: 'video' | 'playlist' | 'channel' | 'all';
} & ClientOptions): Promise<SearchResult>;
/**
 * Convenience helper to get a video's metadata and playback/streaming data.
 * @param videoId The video ID.
 * @param options ClientOptions (e.g. for proxy/fetch customization).
 * @returns Video object with streamingData populated.
 */
declare function getVideoPlayback(videoId: string, options?: ClientOptions): Promise<Video>;

export { Base, BaseVideo, type Cache, ChannelCompact, type ChannelInfo, Client, type ClientOptions, type ClientProfile, type CommentEntry, type CommentsApiRequestOptions, Continuable, type CustomPlaylist, type CustomPlaylistData, type Format, type InnerTubeConfig, Playlist, PlaylistCompact, PlaylistVideos, type SearchItem, SearchResult, type StreamingData, type TasteData, type Thumbnail, Thumbnails, type TranscriptSegment, Video, VideoCompact, type VideoEntry, createCommentsApiRequestOptions, extractPlayerResponse, extractVideoEntries, fetchCommentsFromYouTube, fetchInnerTubeFeed, fetchSubtitlesFromYouTube, fetchYtInitialData, findContinuationToken, getInnerTubeConfig, getSApiSidHash, getSapisidFromCookieString, getVideoPlayback, parseXmlTranscriptRegex, scrapeTasteData, searchYouTube, toPlainText, toSRT, toVTT };
