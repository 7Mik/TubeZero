import { Base } from './base.js';
import { Continuable } from './continuable.js';
import { BaseChannel } from './base-channel.js';
import { Thumbnails } from './thumbnails.js';
import type { Client } from './client.js';
import type { Video } from './video.js';

export class CommentReplies extends Continuable<Comment> {
    constructor(client: Client, public comment: Comment) {
        super(client);
    }

    protected async fetch(): Promise<{ items: Comment[]; continuation?: string | null }> {
        if (!this.continuation) {
            return { items: [], continuation: null };
        }

        const data = await this.client.request('next', {
            continuation: this.continuation
        });

        // Extract replies
        const items: Comment[] = [];
        let nextContinuation: string | null = null;

        const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
        for (const mutation of mutations) {
            const payload = mutation.payload?.commentEntityPayload;
            if (payload) {
                items.push(new Comment(this.client, { payload, video: this.comment.video }));
            }
        }

        // Parse continuation
        function traverse(obj: any) {
            if (!obj || typeof obj !== 'object') return;
            if (obj.continuationCommand && obj.continuationCommand.token) {
                nextContinuation = obj.continuationCommand.token;
                return;
            } else if (obj.continuationItemRenderer?.continuationEndpoint) {
                nextContinuation = obj.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || null;
                return;
            }
            for (const key of Object.keys(obj)) {
                traverse(obj[key]);
            }
        }
        traverse(data);

        return { items, continuation: nextContinuation };
    }
}

export class VideoComments extends Continuable<Comment> {
    constructor(client: Client, public video: Video) {
        super(client);
    }

    protected async fetch(): Promise<{ items: Comment[]; continuation?: string | null }> {
        if (!this.continuation) {
            return { items: [], continuation: null };
        }

        const data = await this.client.request('next', {
            continuation: this.continuation
        });

        const items: Comment[] = [];
        let nextContinuation: string | null = null;

        const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
        for (const mutation of mutations) {
            const payload = mutation.payload?.commentEntityPayload;
            if (payload) {
                items.push(new Comment(this.client, { payload, video: this.video }));
            }
        }

        function traverse(obj: any) {
            if (!obj || typeof obj !== 'object') return;
            if (obj.continuationCommand && obj.continuationCommand.token) {
                nextContinuation = obj.continuationCommand.token;
                return;
            } else if (obj.continuationItemRenderer?.continuationEndpoint) {
                nextContinuation = obj.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || null;
                return;
            }
            for (const key of Object.keys(obj)) {
                traverse(obj[key]);
            }
        }
        traverse(data);

        return { items, continuation: nextContinuation };
    }
}

export class Comment extends Base {
    public id: string;
    public video: Video;
    public author: BaseChannel;
    public content: string;
    public publishDate: string;
    public likeCount: number;
    public isAuthorChannelOwner: boolean;
    public isPinned: boolean;
    public replyCount: number;
    public replies: CommentReplies;

    constructor(client: Client, options: { payload: any; video: Video }) {
        super(client);
        this.video = options.video;
        this.id = '';
        this.content = '';
        this.publishDate = '';
        this.likeCount = 0;
        this.isAuthorChannelOwner = false;
        this.isPinned = false;
        this.replyCount = 0;
        this.author = new BaseChannel(client);
        this.replies = new CommentReplies(client, this);

        this.load(options.payload);
    }

    public load(payload: any): Comment {
        const props = payload.properties || {};
        const toolbar = payload.toolbar || {};
        const authorInfo = payload.author || {};
        const avatar = payload.avatar || {};

        this.id = props.commentId || payload.commentId || '';
        this.content = props.content?.content || payload.contentText?.simpleText || payload.contentText?.runs?.map((r: any) => r.text).join('') || '';
        this.publishDate = props.publishedTime || payload.publishedTimeText?.simpleText || '';
        this.isAuthorChannelOwner = !!authorInfo.isCreator || !!payload.authorIsCreator;
        this.isPinned = !!payload.pinned;

        // Parse like count
        const likeStr = toolbar.likeCountLiked || toolbar.likeCountNotliked || payload.voteCount?.simpleText || '0';
        this.likeCount = parseInt(String(likeStr).replace(/[^0-9]/g, '') || '0', 10);

        // Parse reply count
        const replyStr = toolbar.replyCount || payload.replyCount || '0';
        this.replyCount = parseInt(String(replyStr).replace(/[^0-9]/g, '') || '0', 10);

        // Author details
        const authorId = authorInfo.id || payload.authorEndpoint?.browseEndpoint?.browseId || '';
        const authorName = authorInfo.displayName || payload.authorText?.simpleText || payload.authorText?.runs?.[0]?.text || '';
        const thumbs = avatar.image?.sources || payload.authorThumbnail?.thumbnails || [];

        this.author = new BaseChannel(this.client, {
            channelId: authorId,
            title: { simpleText: authorName },
            thumbnail: { thumbnails: thumbs }
        });

        return this;
    }

    public get url(): string {
        return `https://www.youtube.com/watch?v=${this.video.id}&lc=${this.id}`;
    }
}
