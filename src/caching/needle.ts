/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {CacheContainer} from "node-ts-cache";
import {HashUtils} from "../crypto/hash";

export class NeedleCaching {

    private userCache: CacheContainer;

    constructor(userCache: CacheContainer) {
        this.userCache = userCache;
    }

    checkCache(url: string, callback: (value: any|undefined) => void, error: (error: any) => void) {
        let urlHash = HashUtils.sha1Digest(url);
        this.userCache.getItem(urlHash).then(value => {
            callback(value);
        }).catch(err => {
            error(err);
        });
    }

    saveCache(url: string, response: any, callback: () => void, error: (error: any) => void) {
        let urlHash = HashUtils.sha1Digest(url);
        this.userCache.setItem(urlHash, response, {ttl: 3600}).then(() => {
            callback();
        }).catch(err => {
            error(err);
        });
    }
}