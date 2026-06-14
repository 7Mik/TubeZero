export interface Thumbnail {
    url: string;
    width: number;
    height: number;
}

export class Thumbnails {
    public list: Thumbnail[];

    constructor(list: Thumbnail[]) {
        this.list = list;
    }

    public getBestResolution(): Thumbnail | undefined {
        if (!this.list || this.list.length === 0) {
            return undefined;
        }

        let best: Thumbnail = this.list[0];
        let maxResolution = best.width * best.height;

        for (let i = 1; i < this.list.length; i++) {
            const thumb = this.list[i];
            const resolution = thumb.width * thumb.height;
            if (resolution > maxResolution) {
                maxResolution = resolution;
                best = thumb;
            }
        }

        return best;
    }
}
