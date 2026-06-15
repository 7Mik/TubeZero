import { BaseVideo } from './base-video.js';
import type { Client } from './client.js';

export class Video extends BaseVideo {
    // We will expand this with related videos, comments pagination, and chapters in Sprints 3 & 4.
    constructor(client: Client, data: any) {
        super(client, data);
        // The watch/next endpoint response parsing can be further enriched here
    }
}
