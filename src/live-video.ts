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
    private chatQueue: Set<string> = new Set();
    private pollSessionId: number = 0;
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
        this.watchingCount = parseInt(String(countStr).replace(/[^0-9]/g, '') || '0', 10);

        // Chat continuation
        this.chatContinuation = data.response?.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer?.continuations?.[0]?.reloadContinuationData?.continuation || '';

        return this;
    }

    public playChat(delay = 0): void {
        if (this.isChatPlaying) return;
        this.delay = delay;
        this.isChatPlaying = true;
        const sessionId = ++this.pollSessionId;
        this.pollChatContinuation(sessionId);
    }

    public stopChat(): void {
        this.isChatPlaying = false;
        this.pollSessionId++;
        if (this.chatRequestPoolingTimeout) {
            clearTimeout(this.chatRequestPoolingTimeout);
            this.chatRequestPoolingTimeout = null;
        }
    }

    private async pollChatContinuation(sessionId: number): Promise<void> {
        if (!this.isChatPlaying || !this.chatContinuation || sessionId !== this.pollSessionId) return;

        try {
            const response = await this.client.request('live_chat/get_live_chat', {
                continuation: this.chatContinuation
            });

            if (!response?.continuationContents?.liveChatContinuation || sessionId !== this.pollSessionId) return;

            const chatCont = response.continuationContents.liveChatContinuation;
            const actions = chatCont.actions || [];
            
            for (const action of actions) {
                const item = action.addChatItemAction?.item?.liveChatTextMessageRenderer;
                if (item) {
                    const chat = new Chat(this.client).load(item);
                    if (this.chatQueue.has(chat.id)) continue;
                    this.chatQueue.add(chat.id);
                    if (this.chatQueue.size > 500) {
                        const firstKey = this.chatQueue.keys().next().value;
                        if (firstKey !== undefined) {
                            this.chatQueue.delete(firstKey);
                        }
                    }

                    const timeout = (chat.timestamp / 1000) - (Date.now() - this.delay);
                    setTimeout(() => {
                        if (sessionId === this.pollSessionId) {
                            this.emit('chat', chat);
                        }
                    }, Math.max(0, timeout));
                }
            }

            const continuation = chatCont.continuations?.[0];
            const continuationData = continuation?.timedContinuationData || continuation?.invalidationContinuationData;
            
            if (continuationData && sessionId === this.pollSessionId) {
                this.timeoutMs = continuationData.timeoutMs || 5000;
                this.chatContinuation = continuationData.continuation;
                
                this.chatRequestPoolingTimeout = setTimeout(() => this.pollChatContinuation(sessionId), this.timeoutMs);
            }
        } catch (e) {
            console.error('[LiveVideo] Error polling live chat:', e);
            if (sessionId === this.pollSessionId) {
                this.chatRequestPoolingTimeout = setTimeout(() => this.pollChatContinuation(sessionId), 5000);
            }
        }
    }
}
