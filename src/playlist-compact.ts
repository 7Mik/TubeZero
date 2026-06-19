import { Base } from './base.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';
import type { Client } from './client.js';
import { ChannelInfo } from './video-compact.js';

export class PlaylistCompact extends Base {
    public id: string;
    public title: string;
    public thumbnails: Thumbnails;
    public videoCount: number | null;
    public channel?: ChannelInfo;

    constructor(client: Client, data: any) {
        super(client);

        let playlistId = '';
        let titleText = '';
        let thumbnails: Thumbnail[] = [];
        let videoCountNum: number | null = null;
        let channelObj: ChannelInfo | undefined = undefined;

        if (data.playlistId) {
            playlistId = data.playlistId;
            titleText = data.title?.simpleText || data.title?.runs?.[0]?.text || '';
            thumbnails = data.thumbnails?.[0]?.thumbnails || data.thumbnail?.thumbnails || [];
            
            if (data.videoCount) {
                const parsed = parseInt(data.videoCount, 10);
                videoCountNum = isNaN(parsed) ? null : parsed;
            } else if (data.videoCountText) {
                const text = data.videoCountText.runs?.[0]?.text || data.videoCountText.simpleText || '';
                const cleaned = text.replace(/[^0-9]/g, '');
                if (cleaned) videoCountNum = parseInt(cleaned, 10);
            }

            const byline = data.shortBylineText || data.longBylineText || data.ownerText;
            if (byline && byline.runs && byline.runs[0]) {
                const run = byline.runs[0];
                channelObj = {
                    id: run.navigationEndpoint?.browseEndpoint?.browseId || undefined,
                    name: run.text
                };
            }
        } else if (data.lockupViewModel && data.lockupViewModel.contentId && data.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_PLAYLIST") {
            const model = data.lockupViewModel;
            playlistId = model.contentId;
            const meta = model.metadata?.lockupMetadataViewModel;
            titleText = meta?.title?.content || '';
            const img = model.image?.lockupImageViewModel?.image;
            if (img && img.sources) thumbnails = img.sources;
            
            const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
            let cName = '';
            for (const row of rows) {
                for (const part of row.metadataParts || []) {
                    const text = part.text?.content || '';
                    if (text.includes('video')) {
                        const cleaned = text.replace(/[^0-9]/g, '');
                        if (cleaned) videoCountNum = parseInt(cleaned, 10);
                    } else if (!cName) {
                        cName = text;
                    }
                }
            }
            if (cName) {
                channelObj = { name: cName.replace(/•/g, '').trim() };
            }
        }

        this.id = playlistId;
        this.title = titleText;
        this.thumbnails = new Thumbnails(thumbnails);
        this.videoCount = videoCountNum;
        this.channel = channelObj;
    }
}
