/**
 * index.ts
 * Entry point for the TubeZero library.
 * Consolidates all scraping, comments, and subtitles functionalities.
 */

export {
    fetchYtInitialData,
    extractVideoEntries,
    findContinuationToken,
    fetchInnerTubeFeed,
    scrapeTasteData
} from './scraper.js';

import { Client, getInnerTubeConfig, getSapisidFromCookieString, getSApiSidHash } from './client.js';
export {
    Client,
    getInnerTubeConfig,
    getSapisidFromCookieString,
    getSApiSidHash
};

export type {
    ClientOptions,
    InnerTubeConfig,
    ClientProfile,
    Cache
} from './client.js';

export {
    toSRT,
    toVTT,
    toPlainText
} from './formatters.js';

export type {
    VideoEntry,
    CustomPlaylist,
    CustomPlaylistData,
    TasteData
} from './scraper.js';

export {
    createCommentsApiRequestOptions,
    fetchCommentsFromYouTube
} from './comments.js';

export type {
    CommentEntry,
    CommentsApiRequestOptions
} from './comments.js';

export {
    extractPlayerResponse,
    parseXmlTranscriptRegex,
    fetchSubtitlesFromYouTube
} from './subtitles.js';

export type {
    TranscriptSegment
} from './subtitles.js';

export { Base } from './base.js';
export { Continuable } from './continuable.js';

export {
    Thumbnails
} from './thumbnails.js';

export type {
    Thumbnail
} from './thumbnails.js';

export { VideoCompact } from './video-compact.js';
export type { ChannelInfo } from './video-compact.js';
export { PlaylistCompact } from './playlist-compact.js';
export { ChannelCompact } from './channel-compact.js';

import { SearchResult } from './search-result.js';
export { SearchResult };
export type { SearchItem } from './search-result.js';

export { BaseVideo } from './base-video.js';
export type { StreamingData, Format } from './base-video.js';
import { Video } from './video.js';
export { Video };

export { Playlist, PlaylistVideos } from './playlist.js';

/**
 * Convenience helper to search YouTube without initializing a Client manually.
 * @param query The search query string.
 * @param options ClientOptions & Search filtering options.
 * @returns SearchResult object with video/playlist/channel items.
 */
export async function searchYouTube(
    query: string, 
    options?: { type?: 'video' | 'playlist' | 'channel' | 'all' } & import('./client.js').ClientOptions
): Promise<SearchResult> {
    const client = new Client(options);
    return client.search(query, options);
}

/**
 * Convenience helper to get a video's metadata and playback/streaming data.
 * @param videoId The video ID.
 * @param options ClientOptions (e.g. for proxy/fetch customization).
 * @returns Video object with streamingData populated.
 */
export async function getVideoPlayback(
    videoId: string,
    options?: import('./client.js').ClientOptions
): Promise<Video> {
    const client = new Client(options);
    return client.getVideo(videoId);
}
