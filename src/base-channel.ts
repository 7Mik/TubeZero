import { Base } from './base.js';
import { Continuable } from './continuable.js';
import { VideoCompact } from './video-compact.js';
import { PlaylistCompact } from './playlist-compact.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';
import type { Client } from './client.js';

const TAB_PARAMS: Record<string, string> = {
    videos: 'EgZ2aWRlb3PyBgQKAjoA',
    shorts: 'EgZzaG9ydHPyBgUKA5oBAA%3D%3D',
    live: 'EgdzdHJlYW1z8gYECgJ6AA%3D%3D',
    playlists: 'EglwbGF5bGlzdHPyBgQKAkIA',
    posts: 'EgVwb3N0c_IGBAoCSgA%3D'
};

export class ChannelVideos extends Continuable<VideoCompact> {
    constructor(client: Client, public channel: BaseChannel) {
        super(client);
    }

    protected async fetch(): Promise<{ items: VideoCompact[]; continuation?: string | null }> {
        const data = await this.client.request('browse', {
            browseId: this.channel.id,
            params: TAB_PARAMS.videos,
            continuation: this.continuation || undefined
        });
        return parseTabItems(this.client, data, 'videos');
    }
}

export class ChannelShorts extends Continuable<VideoCompact> {
    constructor(client: Client, public channel: BaseChannel) {
        super(client);
    }

    protected async fetch(): Promise<{ items: VideoCompact[]; continuation?: string | null }> {
        const data = await this.client.request('browse', {
            browseId: this.channel.id,
            params: TAB_PARAMS.shorts,
            continuation: this.continuation || undefined
        });
        return parseTabItems(this.client, data, 'shorts');
    }
}

export class ChannelLive extends Continuable<VideoCompact> {
    constructor(client: Client, public channel: BaseChannel) {
        super(client);
    }

    protected async fetch(): Promise<{ items: VideoCompact[]; continuation?: string | null }> {
        const data = await this.client.request('browse', {
            browseId: this.channel.id,
            params: TAB_PARAMS.live,
            continuation: this.continuation || undefined
        });
        return parseTabItems(this.client, data, 'live');
    }
}

export class ChannelPlaylists extends Continuable<PlaylistCompact> {
    constructor(client: Client, public channel: BaseChannel) {
        super(client);
    }

    protected async fetch(): Promise<{ items: PlaylistCompact[]; continuation?: string | null }> {
        const data = await this.client.request('browse', {
            browseId: this.channel.id,
            params: TAB_PARAMS.playlists,
            continuation: this.continuation || undefined
        });
        return parseTabItems(this.client, data, 'playlists') as any;
    }
}

export class ChannelPosts extends Continuable<any> {
    constructor(client: Client, public channel: BaseChannel) {
        super(client);
    }

    protected async fetch(): Promise<{ items: any[]; continuation?: string | null }> {
        const data = await this.client.request('browse', {
            browseId: this.channel.id,
            params: TAB_PARAMS.posts,
            continuation: this.continuation || undefined
        });
        return parseTabItems(this.client, data, 'posts');
    }
}

export class BaseChannel extends Base {
    public id: string;
    public name: string;
    public handle?: string;
    public description?: string;
    public thumbnails?: Thumbnails;
    public subscriberCount?: string;

    public videos: ChannelVideos;
    public shorts: ChannelShorts;
    public live: ChannelLive;
    public playlists: ChannelPlaylists;
    public posts: ChannelPosts;

    constructor(client: Client, data?: any) {
        super(client);
        this.id = '';
        this.name = '';
        this.videos = new ChannelVideos(client, this);
        this.shorts = new ChannelShorts(client, this);
        this.live = new ChannelLive(client, this);
        this.playlists = new ChannelPlaylists(client, this);
        this.posts = new ChannelPosts(client, this);

        if (data) {
            this.load(data);
        }
    }

    public get url(): string {
        return `https://www.youtube.com/channel/${this.id}`;
    }

    public load(data: any): BaseChannel {
        const headerObj = data.header?.c4TabbedHeaderRenderer || 
                          data.header?.pageHeaderRenderer || 
                          data.c4TabbedHeaderRenderer || 
                          data;

        if (headerObj.pageTitle) {
            this.name = headerObj.pageTitle;
        }

        const viewModel = headerObj.content?.pageHeaderViewModel;
        if (viewModel) {
            this.name = viewModel.title?.dynamicTextViewModel?.text?.content || this.name;
            const thumbs = viewModel.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources || [];
            this.thumbnails = new Thumbnails(thumbs);

            // Parse metadataRows
            const rows = viewModel.metadata?.contentMetadataViewModel?.metadataRows || [];
            for (const row of rows) {
                for (const part of row.metadataParts || []) {
                    const txt = part.text?.content || '';
                    if (txt.includes('subscriber')) {
                        this.subscriberCount = txt;
                    }
                }
            }
        }

        // Try c4TabbedHeaderRenderer structure
        if (headerObj.channelId) {
            this.id = headerObj.channelId;
        }
        if (headerObj.title) {
            this.name = headerObj.title.simpleText || headerObj.title.runs?.[0]?.text || this.name;
        }
        if (headerObj.subscriberCountText) {
            this.subscriberCount = headerObj.subscriberCountText.simpleText || headerObj.subscriberCountText.runs?.[0]?.text || this.subscriberCount;
        }
        if (headerObj.thumbnail) {
            const thumbs = headerObj.thumbnail.thumbnails || [];
            this.thumbnails = new Thumbnails(thumbs);
        }

        // Fallbacks
        this.id = this.id || data.id || data.channelId || '';
        this.name = this.name || data.name || '';
        if (!this.thumbnails || this.thumbnails.length === 0) {
            const thumbs = data.thumbnails || data.thumbnail?.thumbnails || [];
            this.thumbnails = new Thumbnails(thumbs);
        }

        // Find channel ID from contents or service tracking params if missing
        if (!this.id) {
            const serviceParams = data.responseContext?.serviceTrackingParams || [];
            for (const sp of serviceParams) {
                const browseIdParam = sp.params?.find((p: any) => p.key === 'browse_id');
                if (browseIdParam) {
                    this.id = browseIdParam.value;
                    break;
                }
            }
        }

        return this;
    }
}

function parseTabItems(client: Client, data: any, tabName: string): { items: any[]; continuation?: string | null } {
    const items: any[] = [];
    let continuation: string | null = null;

    function traverse(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            for (const item of obj) traverse(item);
            return;
        }

        if (obj.videoRenderer || (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO")) {
            if (tabName !== 'playlists') {
                items.push(new VideoCompact(client, obj.videoRenderer || obj));
            }
            return;
        }

        if (obj.playlistRenderer || (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_PLAYLIST")) {
            if (tabName === 'playlists') {
                items.push(new PlaylistCompact(client, obj.playlistRenderer || obj));
            }
            return;
        }

        if (obj.backstagePostRenderer || obj.sharedPostRenderer) {
            if (tabName === 'posts') {
                items.push(obj);
            }
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
