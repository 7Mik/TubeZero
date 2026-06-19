import { Base } from './base.js';
import { Thumbnails } from './thumbnails.js';
import type { Client } from './client.js';
import { BaseChannel } from './base-channel.js';
import { VideoRelated, parseRelatedData } from './video-related.js';
import { VideoCaptions } from './video-captions.js';

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
    public uploadDate: string | null;
    public channel: BaseChannel | null;
    public channels: BaseChannel[] | null;
    public isLiveContent: boolean;
    public likeCount: number | null;
    public tags: string[];
    public formats: any[];
    public adaptiveFormats: any[];
    public streamingData?: StreamingData;
    public related: VideoRelated;
    public captions: VideoCaptions | null;

    constructor(client: Client, data?: any) {
        super(client);

        this.id = '';
        this.title = '';
        this.description = '';
        this.thumbnails = new Thumbnails([]);
        this.viewCount = null;
        this.uploadDate = null;
        this.channel = null;
        this.channels = null;
        this.isLiveContent = false;
        this.likeCount = null;
        this.tags = [];
        this.formats = [];
        this.adaptiveFormats = [];
        this.related = new VideoRelated(client, this as any);
        this.captions = null;

        if (data) {
            this.parse(data);
        }
    }

    protected parse(data: any): void {
        const videoDetails = data.videoDetails || {};
        const playerResponse = data.playerResponse || data;
        const watchResponse = data.response || {};

        this.id = videoDetails.videoId || playerResponse.videoDetails?.videoId || '';
        this.title = videoDetails.title || playerResponse.videoDetails?.title || '';
        this.description = videoDetails.shortDescription || playerResponse.videoDetails?.shortDescription || '';
        
        const thumbs = videoDetails.thumbnail?.thumbnails || playerResponse.videoDetails?.thumbnail?.thumbnails || [];
        this.thumbnails = new Thumbnails(thumbs);
        
        this.viewCount = videoDetails.viewCount ? parseInt(videoDetails.viewCount, 10) : (playerResponse.videoDetails?.viewCount ? parseInt(playerResponse.videoDetails.viewCount, 10) : null);
        this.isLiveContent = videoDetails.isLiveContent || playerResponse.videoDetails?.isLiveContent || false;

        // Parse channel / author
        const authorId = videoDetails.channelId || playerResponse.videoDetails?.channelId || '';
        const authorName = videoDetails.author || playerResponse.videoDetails?.author || '';
        if (authorId || authorName) {
            this.channel = new BaseChannel(this.client, {
                channelId: authorId,
                title: { simpleText: authorName }
            });
        }

        // Parse like count
        const watchNextResults = watchResponse.contents?.twoColumnWatchNextResults || data.contents?.twoColumnWatchNextResults;
        const primaryInfo = watchNextResults?.results?.results?.contents?.find((c: any) => c.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
        
        if (primaryInfo) {
            this.uploadDate = primaryInfo.dateText?.simpleText || primaryInfo.dateText?.runs?.[0]?.text || null;
            
            // Like button parsing
            const topLevelButtons = primaryInfo.videoActions?.menuRenderer?.topLevelButtons || [];
            let likeButtonText = '';
            for (const button of topLevelButtons) {
                const renderer = button.toggleButtonRenderer || button.buttonRenderer;
                if (renderer) {
                    const label = renderer.defaultText?.accessibility?.accessibilityData?.accessibilityData || renderer.accessibilityData?.accessibilityData?.label;
                    if (label && label.toLowerCase().includes('like')) {
                        likeButtonText = label;
                        break;
                    }
                }
            }
            if (likeButtonText) {
                this.likeCount = parseInt(likeButtonText.replace(/[^0-9]/g, '') || '0', 10) || null;
            }

            // Tags
            const runs = primaryInfo.superTitleLink?.runs || [];
            this.tags = runs.map((r: any) => r.text.trim()).filter((t: string) => t.startsWith('#'));
        }

        // Parse streaming data
        const streamingData = data.streamingData || playerResponse.streamingData;
        if (streamingData) {
            this.formats = streamingData.formats || [];
            this.adaptiveFormats = streamingData.adaptiveFormats || [];
            
            const parseFormat = (f: any): Format => ({
                itag: f.itag,
                url: f.url,
                mimeType: f.mimeType,
                bitrate: f.bitrate,
                width: f.width,
                height: f.height,
                hasVideo: !!f.width || f.mimeType?.includes('video/'),
                hasAudio: !!f.audioBitrate || !!f.audioChannels || f.mimeType?.includes('audio/') || (f.mimeType?.includes('video/') && (f.mimeType?.includes('mp4a') || f.mimeType?.includes('opus') || f.mimeType?.includes('vorbis') || f.mimeType?.includes('ec-3'))),
                isLive: this.isLiveContent,
                contentLength: f.contentLength,
                quality: f.quality,
                qualityLabel: f.qualityLabel,
                audioQuality: f.audioQuality,
                approxDurationMs: f.approxDurationMs
            });

            this.streamingData = {
                expiresInSeconds: streamingData.expiresInSeconds || '0',
                formats: this.formats.map(parseFormat),
                adaptiveFormats: this.adaptiveFormats.map(parseFormat)
            };
        }

        // Related videos
        const relatedRes = parseRelatedData(this.client, data);
        this.related.items = relatedRes.items;
        this.related.continuation = relatedRes.continuation;

        // Captions
        const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer;
        if (captionTracks) {
            this.captions = new VideoCaptions({ video: this as any, client: this.client }).load(captionTracks);
        }
    }

    public get upNext(): any {
        return this.related.items[0] || null;
    }
}
