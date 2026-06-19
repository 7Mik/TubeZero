import { Base } from './base.js';
import { CaptionLanguage, Caption } from './caption.js';
import type { Client } from './client.js';
import type { Video } from './video.js';

export class VideoCaptions extends Base {
    public video: Video;
    public languages: CaptionLanguage[] = [];

    constructor(attr: { video: Video; client: Client }) {
        super(attr.client);
        this.video = attr.video;
    }

    public load(data: any): VideoCaptions {
        const captionTracks = data?.captionTracks || [];
        this.languages = captionTracks.map((track: any) => new CaptionLanguage({
            captions: this,
            name: track.name?.simpleText || track.name?.runs?.[0]?.text || '',
            code: track.languageCode,
            isTranslatable: !!track.isTranslatable,
            url: track.baseUrl
        }));
        return this;
    }

    public async get(languageCode?: string, translationLanguageCode?: string): Promise<Caption[] | undefined> {
        if (!languageCode) {
            languageCode = 'en';
        }
        
        const lang = this.languages.find(l => l.code.toUpperCase() === languageCode?.toUpperCase());
        const url = lang?.url;
        if (!url) return undefined;

        let fetchUrl = `${url}&fmt=json3`;
        if (translationLanguageCode) {
            fetchUrl += `&tlang=${translationLanguageCode}`;
        }

        const response = await this.client.fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch caption: ${response.status}`);
        }

        const json = await response.json();
        const events = json.events || [];
        
        const captions: Caption[] = [];
        for (const e of events) {
            if (e.segs === undefined) continue;
            captions.push(new Caption({
                duration: e.dDurationMs || 0,
                start: e.tStartMs || 0,
                text: e.segs.map((s: any) => s.utf8).join(''),
                segments: e.segs
            }));
        }

        return captions;
    }
}
