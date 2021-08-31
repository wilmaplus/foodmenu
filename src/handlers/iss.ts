/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {ISSRestaurant} from "../models/iss/ISSRestaurant";
import {Http} from "../net/http";
import {parseList, parse} from "../parsers/iss-web"
import {Request, Response} from "express";
import {errorResponse, responseStatus} from "../utils/response_utilities";
import {HashUtils} from "../crypto/hash";
import {CacheContainer} from "node-ts-cache";
import {MemoryStorage} from "node-ts-cache-storage-memory";

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
const listUrl = "https://ravintolapalvelut.iss.fi/ravintolat?nayta=koulut-ja-paivahoito";
let httpClient = new Http();
const type = "iss_web";
let userCache = new CacheContainer(new MemoryStorage());

export function getISSMenus() {
    return new Promise<ISSRestaurant[]>((resolve, reject) => {
        httpClient.get(listUrl, (err, resp) => {
            if (err || resp == undefined) {
                reject(err);
                return;
            }
            let parsedList = parseList(resp.body);
            resolve(parsedList);
        })
    });
}

export function handleISSMenuList(req: Request, res: Response) {
    getISSMenus().then(result => {
        responseStatus(res, 200, true, {menus: result});
    }).catch(err => {
        errorResponse(res, 500, err.toString());
    })
}

export function handleISSMenu(req: Request, res: Response) {
    if (!req.params.url) {
        responseStatus(res, 400, false, {cause: 'URL not specified!'});
        return;
    }
    let url = req.params.url;
    url = url.replace("iss://", "https://");
    let menuKeyHash = HashUtils.sha1Digest(url+"_"+type);
    userCache.getItem(menuKeyHash).then(cacheResponse => {
        if (cacheResponse)
            responseStatus(res, 200, true, cacheResponse as any);
        else {
            httpClient.get(url, (err, resp) => {
                if (err || resp == undefined) {
                    errorResponse(res, 500, err?.toString());
                    return;
                }
                let parsedMenu = parse(resp.body, menuKeyHash);
                userCache.setItem(menuKeyHash, parsedMenu, {}).then(() => {
                    responseStatus(res, 200, true, parsedMenu);
                }).catch(err => {
                    errorResponse(res, 500, err.toString());
                });
            });
        }
    }).catch(err => {
        errorResponse(res, 500, err.toString());
    });
}