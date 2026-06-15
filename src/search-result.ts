import { Continuable } from './continuable.js';
import { Client } from './client.js';
import { VideoCompact } from './video-compact.js';
import { PlaylistCompact } from './playlist-compact.js';
import { ChannelCompact } from './channel-compact.js';

export type SearchItem = VideoCompact | PlaylistCompact | ChannelCompact;

export class SearchResult extends Continuable<SearchItem> {
    
    constructor(client: Client, initialData: any) {
        super(client);
        const { items, continuation } = SearchResult.parseData(client, initialData);
        this.items = items;
        this.continuation = continuation;
    }

    protected async fetch(): Promise<{ items: SearchItem[]; continuation?: string | null }> {
        if (!this.continuation) {
            return { items: [], continuation: null };
        }
        
        const data = await this.client.request('search', {
            continuation: this.continuation
        });
        
        return SearchResult.parseData(this.client, data);
    }

    private static parseData(client: Client, data: any): { items: SearchItem[]; continuation?: string | null } {
        const items: SearchItem[] = [];
        let continuation: string | null = null;

        function traverse(obj: any) {
            if (!obj || typeof obj !== 'object') return;

            if (Array.isArray(obj)) {
                for (const item of obj) traverse(item);
                return;
            }

            if (obj.videoRenderer || (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO")) {
                items.push(new VideoCompact(client, obj.videoRenderer || obj));
                return; // Stop traversing this branch
            }
            if (obj.playlistRenderer) {
                items.push(new PlaylistCompact(client, obj.playlistRenderer));
                return;
            }
            if (obj.channelRenderer) {
                items.push(new ChannelCompact(client, obj.channelRenderer));
                return;
            }

            if (obj.continuationCommand && obj.continuationCommand.token) {
                continuation = obj.continuationCommand.token;
            } else if (obj.continuationItemRenderer?.continuationEndpoint) {
                continuation = obj.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || null;
            }

            for (const key of Object.keys(obj)) {
                traverse(obj[key]);
            }
        }

        traverse(data);

        return { items, continuation };
    }
}
