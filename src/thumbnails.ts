export interface Thumbnail {
    url: string;
    width: number;
    height: number;
}

export class Thumbnails extends Array<Thumbnail> {
    constructor(list: Thumbnail[] | number = []) {
        if (typeof list === 'number') {
            super(list);
        } else {
            super(...list);
        }
    }

    public get min(): string | undefined {
        return this[0]?.url;
    }

    public get best(): string | undefined {
        return this[this.length - 1]?.url;
    }

    public load(thumbnails: Thumbnail[]): Thumbnails {
        this.length = 0;
        this.push(...thumbnails);
        return this;
    }
}
