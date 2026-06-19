import { Base } from './base.js';
import { VideoCompact } from './video-compact.js';
import type { Client } from './client.js';

export class MixPlaylist extends Base {
    public id: string;
    public title: string;
    public videoCount: number;
    public videos: VideoCompact[];

    constructor(client: Client, data?: any) {
        super(client);
        this.id = '';
        this.title = '';
        this.videoCount = 0;
        this.videos = [];

        if (data) {
            this.load(data);
        }
    }

    public load(data: any): MixPlaylist {
        const playlist = data.contents?.twoColumnWatchNextResults?.playlist?.playlist || {};
        this.title = playlist.titleText?.simpleText || playlist.title || '';
        this.id = playlist.playlistId || '';
        
        const contents = playlist.contents || [];
        this.videos = [];
        for (const item of contents) {
            const renderer = item.playlistPanelVideoRenderer;
            if (renderer) {
                this.videos.push(new VideoCompact(this.client, renderer));
            }
        }
        this.videoCount = this.videos.length;

        return this;
    }
}
