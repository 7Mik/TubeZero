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

export { type CommentEntry, type CommentsApiRequestOptions, type CustomPlaylist, type CustomPlaylistData, type InnerTubeConfig, type TasteData, type TranscriptSegment, type VideoEntry, createCommentsApiRequestOptions, extractPlayerResponse, extractVideoEntries, fetchCommentsFromYouTube, fetchInnerTubeFeed, fetchSubtitlesFromYouTube, fetchYtInitialData, findContinuationToken, getInnerTubeConfig, getSApiSidHash, getSapisidFromCookie, parseXmlTranscriptRegex, scrapeTasteData };
