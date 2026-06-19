import { Continuable } from './continuable.js';
import { VideoCompact } from './video-compact.js';
import { PlaylistCompact } from './playlist-compact.js';
import type { Client } from './client.js';
import type { Video } from './video.js';

export class VideoRelated extends Continuable<VideoCompact | PlaylistCompact> {
    constructor(client: Client, public video: Video) {
        super(client);
    }

    protected async fetch(): Promise<{ items: (VideoCompact | PlaylistCompact)[]; continuation?: string | null }> {
        if (!this.continuation) {
            return { items: [], continuation: null };
        }

        const data = await this.client.request('next', {
            continuation: this.continuation
        });

        return parseRelatedData(this.client, data);
    }
}

export function parseRelatedData(client: Client, data: any): { items: (VideoCompact | PlaylistCompact)[]; continuation?: string | null } {
    const items: (VideoCompact | PlaylistCompact)[] = [];
    let continuation: string | null = null;

    // Traverse to find related video renderers
    function traverse(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            for (const item of obj) traverse(item);
            return;
        }

        if (obj.compactVideoRenderer || (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO")) {
            items.push(new VideoCompact(client, obj.compactVideoRenderer || obj));
            return;
        }

        if (obj.compactRadioRenderer || (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_PLAYLIST")) {
            items.push(new PlaylistCompact(client, obj.compactRadioRenderer || obj));
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

    // Scan secondary contents first if exists
    const secondaryContents = data.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems || [];
    if (secondaryContents.length > 0) {
        traverse(secondaryContents);
    } else {
        traverse(data);
    }

    return { items, continuation };
}
