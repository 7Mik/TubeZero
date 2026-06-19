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
        return this.reduce((prev: Thumbnail | undefined, curr: Thumbnail) => {
            if (!prev) return curr;
            return (prev.width * prev.height > curr.width * curr.height) ? prev : curr;
        }, undefined)?.url;
    }

    public load(thumbnails: Thumbnail[]): Thumbnails {
        this.length = 0;
        this.push(...thumbnails);
        return this;
    }
}
