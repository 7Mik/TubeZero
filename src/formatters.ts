import { TranscriptSegment } from './subtitles.js';

/**
 * Format seconds as an SRT timestamp: `HH:MM:SS,mmm`
 * SRT uses comma as the decimal separator per specification.
 */
function formatSrtTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return (
        String(h).padStart(2, '0') +
        ':' +
        String(m).padStart(2, '0') +
        ':' +
        String(s).padStart(2, '0') +
        ',' +
        String(ms).padStart(3, '0')
    );
}

/**
 * Format seconds as a VTT timestamp: `HH:MM:SS.mmm`
 * VTT uses period as the decimal separator per specification.
 */
function formatVttTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return (
        String(h).padStart(2, '0') +
        ':' +
        String(m).padStart(2, '0') +
        ':' +
        String(s).padStart(2, '0') +
        '.' +
        String(ms).padStart(3, '0')
    );
}

/**
 * Convert transcript segments to SubRip (SRT) format.
 *
 * @param segments - Array of transcript segments.
 * @returns A string in SRT format with sequence numbers and `HH:MM:SS,mmm` timestamps.
 */
export function toSRT(segments: TranscriptSegment[]): string {
    return segments
        .map((segment, index) => {
            const start = formatSrtTimestamp(segment.start);
            const end = formatSrtTimestamp(segment.start + segment.duration);
            return `${index + 1}\n${start} --> ${end}\n${segment.text}`;
        })
        .join('\n\n');
}

/**
 * Convert transcript segments to WebVTT (VTT) format.
 *
 * @param segments - Array of transcript segments.
 * @returns A string in VTT format with `WEBVTT` header and `HH:MM:SS.mmm` timestamps.
 */
export function toVTT(segments: TranscriptSegment[]): string {
    const cues = segments
        .map((segment) => {
            const start = formatVttTimestamp(segment.start);
            const end = formatVttTimestamp(segment.start + segment.duration);
            return `${start} --> ${end}\n${segment.text}`;
        })
        .join('\n\n');
    return `WEBVTT\n\n${cues}`;
}

/**
 * Convert transcript segments to plain text.
 *
 * @param segments - Array of transcript segments.
 * @param separator - String to join segments with. Defaults to `'\n'`.
 * @returns A plain text string with segments joined by the separator.
 */
export function toPlainText(segments: TranscriptSegment[], separator = '\n'): string {
    return segments.map((segment) => segment.text).join(separator);
}
