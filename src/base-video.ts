import { Base } from './base.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';
import type { Client } from './client.js';
import { ChannelInfo } from './video-compact.js';

export interface Format {
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

export interface StreamingData {
    expiresInSeconds: string;
    formats: Format[];
    adaptiveFormats: Format[];
}

export class BaseVideo extends Base {
    public id: string;
    public title: string;
    public description: string;
    public thumbnails: Thumbnails;
    public viewCount: number | null;
    public publishDate: string | null;
    public channel?: ChannelInfo;
    public isLive: boolean;
    public streamingData?: StreamingData;

    constructor(client: Client, data: any) {
        super(client);

        this.id = '';
        this.title = '';
        this.description = '';
        this.thumbnails = new Thumbnails([]);
        this.viewCount = null;
        this.publishDate = null;
        this.isLive = false;

        this.parse(data);
    }

    protected parse(data: any): void {
        const videoDetails = data.videoDetails || data.microformat?.playerMicroformatRenderer || {};
        
        this.id = videoDetails.videoId || '';
        this.title = typeof videoDetails.title === 'string' ? videoDetails.title : (videoDetails.title?.simpleText || videoDetails.title?.runs?.[0]?.text || '');
        this.description = videoDetails.shortDescription || videoDetails.description?.simpleText || videoDetails.description?.runs?.map((r: any) => r.text).join('') || '';
        this.thumbnails = new Thumbnails(videoDetails.thumbnail?.thumbnails || []);
        this.viewCount = videoDetails.viewCount ? parseInt(videoDetails.viewCount, 10) : null;
        this.isLive = videoDetails.isLiveContent || false;
        this.publishDate = videoDetails.publishDate || null;

        // Parse channel info if available in microformat or videoDetails
        this.channel = {
            name: videoDetails.author || videoDetails.ownerChannelName || '',
            id: videoDetails.channelId || videoDetails.externalChannelId || ''
        };

        if (data.streamingData) {
            const parseFormat = (f: any): Format => ({
                itag: f.itag,
                url: f.url,
                mimeType: f.mimeType,
                bitrate: f.bitrate,
                width: f.width,
                height: f.height,
                hasVideo: !!f.width || f.mimeType?.includes('video/'),
                hasAudio: !!f.audioBitrate || f.mimeType?.includes('audio/'),
                isLive: !!data.videoDetails?.isLiveContent,
                contentLength: f.contentLength,
                quality: f.quality,
                qualityLabel: f.qualityLabel,
                audioQuality: f.audioQuality,
                approxDurationMs: f.approxDurationMs
            });

            this.streamingData = {
                expiresInSeconds: data.streamingData.expiresInSeconds || '0',
                formats: (data.streamingData.formats || []).map(parseFormat),
                adaptiveFormats: (data.streamingData.adaptiveFormats || []).map(parseFormat)
            };
        }
    }
}
