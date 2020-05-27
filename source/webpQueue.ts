export class WebpQueue<T> {
    private queue: T[];
    private length: number;

    public constructor() {
        this.length = 0;
        this.queue = new Array<T>();
    }

    public isEmpty(): boolean {
        return this.length === 0;
    }

    public enqueue(newItems: T[]): void {
        this.queue = [...newItems, ...this.queue];
    }

    public dequeue(): T {
        return this.queue.pop();
    }
}