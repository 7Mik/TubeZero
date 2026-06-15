import { Base } from './base.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';
import type { Client } from './client.js';
import { ChannelInfo } from './video-compact.js';

export class BaseVideo extends Base {
    public id: string;
    public title: string;
    public description: string;
    public thumbnails: Thumbnails;
    public viewCount: number | null;
    public publishDate: string | null;
    public channel?: ChannelInfo;
    public isLive: boolean;

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
        this.title = videoDetails.title?.simpleText || videoDetails.title?.runs?.[0]?.text || typeof videoDetails.title === 'string' ? videoDetails.title : '';
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
    }
}
