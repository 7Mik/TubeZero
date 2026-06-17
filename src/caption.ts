export interface CaptionSegment {
    utf8: string;
    tOffsetMs?: number;
    acpText?: string;
}

export class CaptionLanguage {
    public captions: VideoCaptions;
    public name: string;
    public code: string;
    public isTranslatable: boolean;
    public url: string;

    constructor(attr: { captions: VideoCaptions; name: string; code: string; isTranslatable: boolean; url: string }) {
        this.captions = attr.captions;
        this.name = attr.name;
        this.code = attr.code;
        this.isTranslatable = attr.isTranslatable;
        this.url = attr.url;
    }

    public async get(translationLanguageCode?: string): Promise<Caption[] | undefined> {
        return this.captions.get(this.code, translationLanguageCode);
    }
}

export class Caption {
    public duration!: number;
    public start!: number;
    public text!: string;
    public segments?: CaptionSegment[];

    constructor(attr: Partial<Caption>) {
        Object.assign(this, attr);
    }

    public get end(): number {
        return this.start + this.duration;
    }
}

import type { VideoCaptions } from './video-captions.js';
