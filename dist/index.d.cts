/**
 * scraper.ts
 * Scrapes user-specific YouTube feeds: History, Likes, Watch Later, and Custom Playlists.
 * Works client-side (Chrome extensions, desktop apps, or CORS-proxied environments).
 */
interface VideoEntry {
    title: string;
    channel: string;
}
interface InnerTubeConfig {
    apiKey: string | null;
    clientVersion: string;
    idToken: string | null;
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
 * Reads SAPISID cookies from the browser environment.
 * Only works if running on a youtube.com domain or in an extension with cookie access.
 * @returns The SAPISID value or null.
 */
declare function getSapisidFromCookie(): string | null;
/**
 * Generates the SAPISIDHASH Authorization header value needed for authenticated InnerTube requests.
 * @param sapisid - The SAPISID cookie value.
 * @param origin - The request origin.
 * @returns The generated authorization hash or null.
 */
declare function getSApiSidHash(sapisid: string, origin?: string): Promise<string | null>;
/**
 * Recursively scans a JSON object to extract video entries { title, channel }.
 * Handles both the legacy videoRenderer and the newer lockupViewModel schemas.
 * @param data - The JSON object to search.
 * @returns Array of extracted video entries.
 */
declare function extractVideoEntries(data: any): VideoEntry[];
/**
 * Extracts InnerTube credentials and configuration parameters by parsing the YouTube home page.
 * @param injectedConfig - Pre-fetched config if available (bypasses fetching).
 * @returns InnerTube config parameters.
 */
declare function getInnerTubeConfig(injectedConfig?: Partial<InnerTubeConfig> | null): Promise<InnerTubeConfig>;
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

declare class BaseVideo extends Base {
    id: string;
    title: string;
    description: string;
    thumbnails: Thumbnails;
    viewCount: number | null;
    publishDate: string | null;
    channel?: ChannelInfo;
    isLive: boolean;
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

interface ClientOptions {
    apiKey?: string | null;
    clientVersion?: string;
    idToken?: string | null;
    cookie?: string;
}
declare class Client {
    apiKey: string | null;
    clientVersion: string;
    idToken: string | null;
    cookie: string;
    constructor(options?: ClientOptions);
    /**
     * Asynchronously resolves config parameters if apiKey is not set yet.
     * Fetches and parses YouTube's home page HTML using the scraper logic.
     */
    ensureConfig(): Promise<void>;
    /**
     * Dispatches an authenticated or unauthenticated POST request to the specified InnerTube endpoint.
     */
    request(endpoint: string, payload: any): Promise<any>;
    /**
     * Searches YouTube for the given query.
     */
    search(query: string, options?: {
        type?: 'video' | 'playlist' | 'channel' | 'all';
    }): Promise<SearchResult>;
    /**
     * Gets metadata for a specific video.
     */
    getVideo(videoId: string): Promise<Video>;
    /**
     * Gets metadata and videos for a specific playlist.
     */
    getPlaylist(playlistId: string): Promise<Playlist>;
}

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
 * @param videoId - The YouTube Video ID.
 * @param language - The desired language code (e.g. 'en', 'it', 'es').
 * @returns Array of transcript segments.
 */
declare function fetchSubtitlesFromYouTube(videoId: string, language?: string): Promise<TranscriptSegment[]>;

export { Base, BaseVideo, ChannelCompact, type ChannelInfo, Client, type ClientOptions, type CommentEntry, type CommentsApiRequestOptions, Continuable, type CustomPlaylist, type CustomPlaylistData, type InnerTubeConfig, Playlist, PlaylistCompact, PlaylistVideos, type SearchItem, SearchResult, type TasteData, type Thumbnail, Thumbnails, type TranscriptSegment, Video, VideoCompact, type VideoEntry, createCommentsApiRequestOptions, extractPlayerResponse, extractVideoEntries, fetchCommentsFromYouTube, fetchInnerTubeFeed, fetchSubtitlesFromYouTube, fetchYtInitialData, findContinuationToken, getInnerTubeConfig, getSApiSidHash, getSapisidFromCookie, parseXmlTranscriptRegex, scrapeTasteData };
