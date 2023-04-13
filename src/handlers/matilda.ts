import {Request, Response} from "express";
import {responseStatus} from "../utils/response_utilities";
import {Http} from "../net/http";
import {CacheContainer} from "node-ts-cache";
import {MemoryStorage} from "node-ts-cache-storage-memory";
import {extractNextJSBuildId, parseMatildaModel} from "../parsers/matilda";
import {randomUUID} from "crypto";
import fetch from "node-fetch";
import {Restaurant} from "../models/Restaurant";

import {Day} from "../models/Day";

let httpClient = new Http();
let userCache = new CacheContainer(new MemoryStorage());
const baseUrl = "https://menu.matildaplatform.com/"



export async function getBuildId() {
    const homepageHTML: string = await new Promise((resolve, reject) => {
        httpClient.get(baseUrl, (fetchErr, fetchResp) => {
            if (fetchErr || fetchResp == undefined) {
                reject(fetchResp);
                return;
            }
            resolve(fetchResp.body);
        });
    })
    return extractNextJSBuildId(homepageHTML);
}

export async function getMenuJSON(buildId: string) {
    let data = await fetch(baseUrl+`_next/data/${buildId}/fi.json`)
    return await data.json()
}

export async function getMenuBaseUrl(buildId: string, id: string) {
    let data = await fetch(baseUrl+`_next/data/${buildId}/fi/meals/week/${id}.json`)
    return await data.json()
}

export async function getMenuData(buildId: string, id: string, query: string = "") {
    let data = await fetch(baseUrl+`_next/data/${buildId}/fi/meals/week/${id}.json${query}`)
    return await data.json()
}

/**
 * Get Restaurant data with meals
 * @param req
 * @param res
 */
export async function getRestaurantPage(req: Request, res: Response) {
    try {
        if (!req.params.id) {
            responseStatus(res, 400, false, {cause: 'Required parameters not specified!'});
            return;
        }
        let id = req.params.id;
        let cache = await userCache.getItem(id);
        if (cache) {
            return responseStatus(res, 200, true, {menu: cache, diets: []});
        }
        let buildId = await getBuildId();
        let menuBaseUrl = await getMenuBaseUrl(buildId, id);
        if (!menuBaseUrl?.pageProps?.__N_REDIRECT) {
            responseStatus(res, 404, false, {cause: 'Restaurant not found!'});
            return;
        }
        let realMenuId = menuBaseUrl?.pageProps?.__N_REDIRECT.split("/").pop();
        let menuItems = await getMenuData(buildId, realMenuId);


        let days: Day[] = []
        if (menuItems?.pageProps?.meals) {
            days = await parseMatildaModel(menuItems?.pageProps?.meals);
        }

        try {
            if (menuItems?.pageProps?.nextURL) {
                let query = menuItems.pageProps.nextURL.split("?").pop()
                let json = await getMenuData(buildId, realMenuId, "?"+query+"&id="+realMenuId);
                days = [...days, ...await parseMatildaModel(json?.pageProps?.meals)];
            }
        } catch (e) {console.log(e)}

        await userCache.setItem(id, days, {ttl: 3600});

        responseStatus(res, 200, true, {menu: days, diets: []});
    } catch (error: any) {
        let uuid = randomUUID()
        console.log(error, "getRestaurantPage", uuid)
        responseStatus(res, 500, false, {cause: "Unexpected error occurred, id: "+uuid});
    }
}

/**
 * Get restaurants
 */
export async function getMenuOptions(req: Request, res: Response) {
    try {
        let id = await getBuildId();
        let menuJson = await getMenuJSON(id);
        let restaurants: Restaurant[] = [];
        if (menuJson?.pageProps?.distributors) {
            restaurants = menuJson.pageProps.distributors.map((i: { id: string; name: string; }) => new Restaurant(i.id, i.name));
        }
        responseStatus(res, 200, true, {restaurants});
    } catch (error: any) {
        let uuid = randomUUID()
        console.log(error, "getMenuOptions", uuid)
        responseStatus(res, 500, false, {cause: "Unexpected error occurred, id: "+uuid});
    }
}
