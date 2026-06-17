import { BaseVideo } from './base-video.js';
import { Chat } from './chat.js';
import type { Client } from './client.js';

export class LiveVideo extends BaseVideo {
    public watchingCount: number = 0;
    public chatContinuation: string = '';
    
    private delay: number = 0;
    private chatRequestPoolingTimeout: any = null;
    private timeoutMs: number = 0;
    private isChatPlaying: boolean = false;
    private chatQueue: Chat[] = [];
    private listeners: Record<string, Function[]> = {};

    constructor(client: Client, data?: any) {
        super(client, data);
        if (data) {
            this.load(data);
        }
    }

    public on(event: string, listener: Function): this {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
        return this;
    }

    public emit(event: string, ...args: any[]): boolean {
        const list = this.listeners[event];
        if (!list || list.length === 0) return false;
        for (const listener of list) {
            listener(...args);
        }
        return true;
    }

    public load(data: any): LiveVideo {
        super.parse(data);

        // Parse watching count
        const videoDetails = data.videoDetails || {};
        const runText = data.response?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.viewCount?.videoViewCountRenderer?.viewCount?.runs?.map((r: any) => r.text).join(' ');
        
        const countStr = runText || videoDetails.viewCount || '0';
        this.watchingCount = parseInt(countStr.replace(/[^0-9]/g, '') || '0', 10);

        // Chat continuation
        this.chatContinuation = data.response?.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer?.continuations?.[0]?.reloadContinuationData?.continuation || '';

        return this;
    }

    public playChat(delay = 0): void {
        if (this.isChatPlaying) return;
        this.delay = delay;
        this.isChatPlaying = true;
        this.pollChatContinuation();
    }

    public stopChat(): void {
        if (!this.chatRequestPoolingTimeout) return;
        this.isChatPlaying = false;
        clearTimeout(this.chatRequestPoolingTimeout);
    }

    private async pollChatContinuation(): Promise<void> {
        if (!this.isChatPlaying || !this.chatContinuation) return;

        try {
            const response = await this.client.request('live_chat/get_live_chat', {
                continuation: this.chatContinuation
            });

            if (!response?.continuationContents?.liveChatContinuation) return;

            const chatCont = response.continuationContents.liveChatContinuation;
            const actions = chatCont.actions || [];
            
            for (const action of actions) {
                const item = action.addChatItemAction?.item?.liveChatTextMessageRenderer;
                if (item) {
                    const chat = new Chat(this.client).load(item);
                    if (this.chatQueue.some(c => c.id === chat.id)) continue;
                    this.chatQueue.push(chat);

                    const timeout = (chat.timestamp / 1000) - (Date.now() - this.delay);
                    setTimeout(() => this.emit('chat', chat), Math.max(0, timeout));
                }
            }

            const continuation = chatCont.continuations?.[0];
            const continuationData = continuation?.timedContinuationData || continuation?.invalidationContinuationData;
            
            if (continuationData) {
                this.timeoutMs = continuationData.timeoutMs || 5000;
                this.chatContinuation = continuationData.continuation;
                
                this.chatRequestPoolingTimeout = setTimeout(() => this.pollChatContinuation(), this.timeoutMs);
            }
        } catch (e) {
            console.error('[LiveVideo] Error polling live chat:', e);
            // Retry after 5 seconds
            this.chatRequestPoolingTimeout = setTimeout(() => this.pollChatContinuation(), 5000);
        }
    }
}
