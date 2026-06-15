import { Base } from './base.js';

export abstract class Continuable<T> extends Base {
    public items: T[] = [];
    public continuation?: string | null = undefined;
    private iteratorIndex: number = 0;

    protected abstract fetch(): Promise<{ items: T[]; continuation?: string | null }>;

    public async next(count?: number): Promise<T[]> {
        const newItems: T[] = [];

        if (count === undefined) {
            if (this.iteratorIndex < this.items.length) {
                const unread = this.items.slice(this.iteratorIndex);
                this.iteratorIndex = this.items.length;
                return unread;
            }

            if (this.continuation === null) {
                return [];
            }
            const result = await this.fetch();
            this.items.push(...result.items);
            this.continuation = result.continuation ?? null;
            newItems.push(...result.items);
            this.iteratorIndex = this.items.length;
        } else {
            while (newItems.length < count) {
                if (this.iteratorIndex < this.items.length) {
                    const take = Math.min(count - newItems.length, this.items.length - this.iteratorIndex);
                    newItems.push(...this.items.slice(this.iteratorIndex, this.iteratorIndex + take));
                    this.iteratorIndex += take;
                }

                if (newItems.length >= count || this.continuation === null) {
                    break;
                }

                const result = await this.fetch();
                if (result.items.length === 0) {
                    this.continuation = result.continuation ?? null;
                    break;
                }

                this.items.push(...result.items);
                this.continuation = result.continuation ?? null;
            }
        }

        return newItems;
    }
}
