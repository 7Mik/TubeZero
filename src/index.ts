/**
 * index.ts
 * Entry point for the TubeZero library.
 * Consolidates all scraping, comments, and subtitles functionalities.
 */

export {
    fetchYtInitialData,
    getSapisidFromCookie,
    getSApiSidHash,
    extractVideoEntries,
    getInnerTubeConfig,
    findContinuationToken,
    fetchInnerTubeFeed,
    scrapeTasteData
} from './scraper.js';

export {
    Client
} from './client.js';

export type {
    ClientOptions
} from './client.js';

export type {
    VideoEntry,
    InnerTubeConfig,
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

export { SearchResult } from './search-result.js';
export type { SearchItem } from './search-result.js';

export { BaseVideo } from './base-video.js';
export { Video } from './video.js';

export { Playlist, PlaylistVideos } from './playlist.js';
