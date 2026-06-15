import { Base } from './base.js';
import { Thumbnails, Thumbnail } from './thumbnails.js';
import type { Client } from './client.js';

export class ChannelCompact extends Base {
    public id: string;
    public name: string;
    public thumbnails: Thumbnails;
    public subscriberCount: string | null;

    constructor(client: Client, data: any) {
        super(client);

        let channelId = '';
        let nameText = '';
        let thumbnails: Thumbnail[] = [];
        let subCount: string | null = null;

        if (data.channelId) {
            channelId = data.channelId;
            nameText = data.title?.simpleText || data.title?.runs?.[0]?.text || '';
            thumbnails = data.thumbnail?.thumbnails || [];

            if (data.subscriberCountText) {
                subCount = data.subscriberCountText.simpleText || data.subscriberCountText.runs?.[0]?.text || null;
            } else if (data.videoSubscriberCountText) {
                subCount = data.videoSubscriberCountText.simpleText || data.videoSubscriberCountText.runs?.[0]?.text || null;
            }
        }

        this.id = channelId;
        this.name = nameText;
        this.thumbnails = new Thumbnails(thumbnails);
        this.subscriberCount = subCount;
    }
}
