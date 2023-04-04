/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import needle, {NeedleResponse} from "needle";
import {CacheContainer} from "node-ts-cache";
import {MemoryStorage} from "node-ts-cache-storage-memory";
import {NeedleCaching} from "../caching/needle";

export class Http {

    cache: NeedleCaching

    constructor() {
        this.cache = new NeedleCaching(new CacheContainer(new MemoryStorage()));
    }

    /**
     * GET request with caching
     * @param url
     * @param callback
     */
    get(url: string, callback: (error: Error|null, response: NeedleResponse|null) => void) {
        this.cache.checkCache(url, content => {
            if (content)
                callback(null, content);
            else {
                needle.get(url, (error, response) => {
                    if (error) {
                        callback(error, response);
                        return;
                    }
                    this.cache.saveCache(url, response, () => {
                        callback(null, response);
                    }, cacheError => {
                        callback(cacheError, null);
                    })
                });
            }
        }, cacheError => {
            callback(cacheError, null);
        });
    }

}
