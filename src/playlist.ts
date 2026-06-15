import { Base } from './base.js';
import type { Client } from './client.js';
import { Continuable } from './continuable.js';
import { VideoCompact, ChannelInfo } from './video-compact.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';

export class PlaylistVideos extends Continuable<VideoCompact> {
    constructor(client: Client, initialData: any) {
        super(client);
        const { items, continuation } = PlaylistVideos.parseData(client, initialData);
        this.items = items;
        this.continuation = continuation;
    }

    protected async fetch(): Promise<{ items: VideoCompact[]; continuation?: string | null }> {
        if (!this.continuation) {
            return { items: [], continuation: null };
        }
        
        const data = await this.client.request('browse', {
            continuation: this.continuation
        });
        
        return PlaylistVideos.parseData(this.client, data);
    }

    private static parseData(client: Client, data: any): { items: VideoCompact[]; continuation?: string | null } {
        const items: VideoCompact[] = [];
        let continuation: string | null = null;

        function traverse(obj: any) {
            if (!obj || typeof obj !== 'object') return;

            if (Array.isArray(obj)) {
                for (const item of obj) traverse(item);
                return;
            }

            if (obj.playlistVideoRenderer) {
                items.push(new VideoCompact(client, obj.playlistVideoRenderer));
                return;
            }

            if (obj.continuationCommand && obj.continuationCommand.token) {
                continuation = obj.continuationCommand.token;
            } else if (obj.continuationItemRenderer && obj.continuationItemRenderer.continuationEndpoint) {
                continuation = obj.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
            }

            for (const key of Object.keys(obj)) {
                traverse(obj[key]);
            }
        }

        traverse(data);

        return { items, continuation };
    }
}

export class Playlist extends Base {
    public id: string;
    public title: string;
    public videoCount: number;
    public viewCount: number;
    public lastUpdated: string;
    public channel?: ChannelInfo;
    public videos: PlaylistVideos;

    constructor(client: Client, data: any) {
        super(client);

        this.id = '';
        this.title = '';
        this.videoCount = 0;
        this.viewCount = 0;
        this.lastUpdated = '';

        this.parse(data);
        this.videos = new PlaylistVideos(client, data);
    }

    private parse(data: any): void {
        let header = data.header?.playlistHeaderRenderer;
        let pageHeader = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
        
        if (header) {
            this.id = header.playlistId || '';
            this.title = header.title?.simpleText || header.title?.runs?.[0]?.text || '';
            const numVideosRaw = header.numVideosText?.runs?.[0]?.text || header.numVideosText?.simpleText || '';
            this.videoCount = parseInt(numVideosRaw.replace(/[^0-9]/g, '') || '0', 10);
            const viewCountRaw = header.viewCountText?.simpleText || header.viewCountText?.runs?.[0]?.text || '';
            this.viewCount = parseInt(viewCountRaw.replace(/[^0-9]/g, '') || '0', 10);
            
            const owner = header.ownerText?.runs?.[0];
            if (owner) {
                this.channel = {
                    id: owner.navigationEndpoint?.browseEndpoint?.browseId || undefined,
                    name: owner.text
                };
            }
        } else if (pageHeader) {
            // Extract playlist ID from the microformat or URL context
            this.id = data.microformat?.microformatDataRenderer?.urlCanonical?.split('list=')?.[1]?.split('&')?.[0] 
                || data.responseContext?.serviceTrackingParams?.find((p: any) => p.params?.find((pp: any) => pp.key === 'browse_id'))?.params?.find((pp: any) => pp.key === 'browse_id')?.value?.replace('VL', '')
                || '';
            this.title = pageHeader.title?.dynamicTextViewModel?.text?.content || '';
            
            const rows = pageHeader.metadata?.contentMetadataViewModel?.metadataRows || [];
            for (const row of rows) {
                for (const part of row.metadataParts || []) {
                    // Check for avatar stack (channel)
                    if (part.avatarStack?.avatarStackViewModel?.text?.content) {
                        const rawName = part.avatarStack.avatarStackViewModel.text.content;
                        this.channel = { name: rawName.replace(/^by\s+/i, '').trim() };
                        
                        // Try to get channel ID
                        const runs = part.avatarStack.avatarStackViewModel.text.commandRuns || [];
                        if (runs[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId) {
                            this.channel.id = runs[0].onTap.innertubeCommand.browseEndpoint.browseId;
                        }
                    }
                    
                    // Check for video/view counts in text parts
                    if (part.text?.content) {
                        const text = part.text.content;
                        if (text.includes('video')) {
                            this.videoCount = parseInt(text.replace(/[^0-9]/g, '') || '0', 10);
                        } else if (text.includes('view')) {
                            this.viewCount = parseInt(text.replace(/[^0-9]/g, '') || '0', 10);
                        }
                    }
                }
            }
        }
    }
}
