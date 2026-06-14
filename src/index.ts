/**
 * index.ts
 * Entry point for the TubeVanilla library.
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
