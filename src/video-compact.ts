import { Base } from './base.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';
import type { Client } from './client.js';

export interface ChannelInfo {
    id?: string;
    name: string;
    thumbnails?: Thumbnails;
}

export class VideoCompact extends Base {
    public id: string;
    public title: string;
    public thumbnails: Thumbnails;
    public duration: number | null;
    public isLive: boolean;
    public channel?: ChannelInfo;
    public viewCount: number | null;
    public publishedAt: string | null;

    constructor(client: Client, data: any) {
        super(client);

        let videoId = '';
        let titleText = '';
        let durationSec = null;
        let isLive = false;
        let viewCountNum = null;
        let pubAt = null;
        let thumbnails: Thumbnail[] = [];
        let channelObj: ChannelInfo | undefined = undefined;

        // Legacy videoRenderer or modern lockupViewModel
        if (data.videoId) {
            // videoRenderer / gridVideoRenderer
            videoId = data.videoId;
            titleText = data.title?.simpleText || data.title?.runs?.[0]?.text || '';
            thumbnails = data.thumbnail?.thumbnails || [];
            
            if (data.lengthText) {
                const text = data.lengthText.simpleText || data.lengthText.runs?.[0]?.text || '';
                durationSec = this.parseDuration(text);
            }
            if (data.badges?.some((b: any) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW')) {
                isLive = true;
            }
            if (data.viewCountText) {
                const text = data.viewCountText.simpleText || data.viewCountText.runs?.[0]?.text || '';
                viewCountNum = this.parseViewCount(text);
            }
            if (data.publishedTimeText) {
                pubAt = data.publishedTimeText.simpleText || data.publishedTimeText.runs?.[0]?.text || null;
            }

            const byline = data.shortBylineText || data.longBylineText || data.ownerText;
            if (byline && byline.runs && byline.runs[0]) {
                const run = byline.runs[0];
                channelObj = {
                    id: run.navigationEndpoint?.browseEndpoint?.browseId || undefined,
                    name: run.text,
                    thumbnails: data.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails 
                        ? new Thumbnails(data.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails)
                        : undefined
                };
            }
        } else if (data.lockupViewModel && data.lockupViewModel.contentId && data.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
            // Modern lockupViewModel
            const model = data.lockupViewModel;
            videoId = model.contentId;
            const meta = model.metadata?.lockupMetadataViewModel;
            titleText = meta?.title?.content || '';
            
            // Extract channel from metadataRows
            const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
            let cName = '';
            let vCount = null;
            let pAt = null;
            for (const row of rows) {
                for (const part of row.metadataParts || []) {
                    const text = part.text?.content || '';
                    if (text.includes('views') || text.includes('watching')) {
                        if (text.includes('watching')) isLive = true;
                        vCount = this.parseViewCount(text);
                    } else if (text.includes('ago')) {
                        pAt = text;
                    } else {
                        cName = text;
                    }
                }
            }
            if (cName) {
                channelObj = { name: cName.replace(/•/g, '').trim() };
            }
            viewCountNum = vCount;
            pubAt = pAt;
        }

        this.id = videoId;
        this.title = titleText;
        this.thumbnails = new Thumbnails(thumbnails);
        this.duration = durationSec;
        this.isLive = isLive;
        this.channel = channelObj;
        this.viewCount = viewCountNum;
        this.publishedAt = pubAt;
    }

    private parseDuration(text: string): number {
        const parts = text.split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parts[0] || 0;
    }

    private parseViewCount(text: string): number | null {
        const cleaned = text.trim().replace(/,/g, '');
        const match = cleaned.match(/([\d.]+)\s*([KMB])?/i);
        if (!match) return null;
        const num = parseFloat(match[1]);
        if (isNaN(num)) return null;
        const suffix = match[2]?.toUpperCase();
        if (suffix === 'K') return Math.round(num * 1000);
        if (suffix === 'M') return Math.round(num * 1000000);
        if (suffix === 'B') return Math.round(num * 1000000000);
        const result = Math.round(num);
        return isNaN(result) ? null : result;
    }
}
