import { Base } from './base.js';

export abstract class Continuable<T> extends Base {
    public items: T[] = [];
    public continuation?: string | null = undefined;

    protected abstract fetch(): Promise<{ items: T[]; continuation?: string | null }>;

    public async next(count?: number): Promise<T[]> {
        const newItems: T[] = [];

        if (count === undefined) {
            if (this.items.length > 0 && (this.continuation === null || this.continuation === undefined)) {
                return [];
            }
            const result = await this.fetch();
            this.items.push(...result.items);
            this.continuation = result.continuation ?? null;
            newItems.push(...result.items);
        } else {
            while (newItems.length < count) {
                if (this.items.length > 0 && (this.continuation === null || this.continuation === undefined)) {
                    break;
                }

                const result = await this.fetch();
                if (result.items.length === 0) {
                    this.continuation = result.continuation ?? null;
                    break;
                }

                this.items.push(...result.items);
                this.continuation = result.continuation ?? null;
                newItems.push(...result.items);
            }
        }

        return count === undefined ? newItems : newItems.slice(0, count);
    }
}
