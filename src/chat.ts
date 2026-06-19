import { Base } from './base.js';
import { BaseChannel } from './base-channel.js';
import { Thumbnails } from './thumbnails.js';
import type { Client } from './client.js';

export class Chat extends Base {
    public id!: string;
    public message!: string;
    public author!: BaseChannel;
    public timestamp!: number;

    constructor(client: Client, data?: any) {
        super(client);
        if (data) {
            this.load(data);
        }
    }

    public load(data: any): Chat {
        const { id, message, authorName, authorPhoto, timestampUsec, authorExternalChannelId } = data;
        
        this.id = id;
        this.message = message?.runs?.map((r: any) => r.text).join('') || '';
        this.timestamp = parseInt(timestampUsec || '0', 10);
        
        this.author = new BaseChannel(this.client, {
            channelId: authorExternalChannelId,
            title: { simpleText: authorName },
            thumbnail: { thumbnails: authorPhoto }
        });

        return this;
    }
}
