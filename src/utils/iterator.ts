/*
 * Copyright (c) 2021 wilmaplus-notifier2, developed by @developerfromjokela, for Wilma Plus mobile app
 */

export class AsyncIterator<T> {
    currentItem = -1
    items: T[]
    callback:(item: T, iterator: AsyncIterator<T>) => void;
    endCallback:() => void;


    constructor(callback:(item: T, iterator: AsyncIterator<T>) => void, items:T[], endCallback: () => void) {
        this.items = items;
        this.callback = callback;
        this.endCallback = endCallback;
    }

    nextItem() {
        if (this.currentItem+1 < this.items.length) {
            this.currentItem++;
            this.callback(this.items[this.currentItem], this);
        } else {
            this.endCallback();
        }
    }

    start = this.nextItem;
}
