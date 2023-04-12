/*
 * Copyright (c) 2022 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Request, Response} from "express";
import {responseStatus} from "../utils/response_utilities";
import {Builder, By, ThenableWebDriver, until, WebElement} from "selenium-webdriver";
import {Restaurant} from "../models/Restaurant";
import {elementLocated} from "selenium-webdriver/lib/until";
import {Http} from "../net/http";
import {extractFormParams, extractRestaurantPDFLink, parse, parseRestaurants, parseRSSFeed} from "../parsers/aromiv2";
import {CacheContainer} from "node-ts-cache";
import {MemoryStorage} from "node-ts-cache-storage-memory";
import {HashUtils} from "../crypto/hash";
import {Diet} from "../models/Diet";
import {Options} from "selenium-webdriver/chrome";
import moment from "moment";
import {Day} from "../models/Day";
import fetch from "node-fetch";
import {Cookies} from "needle";

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
let httpClient = new Http();
let userCache = new CacheContainer(new MemoryStorage());

// Disable image loading to save data
const chromeConfig = {
    profile: {
        default_content_setting_values: {'images': 2,
            'plugins': 2, 'popups': 2, 'geolocation': 2,
            'notifications': 2, 'auto_select_certificate': 2, 'fullscreen': 2,
            'mouselock': 2, 'mixed_script': 2, 'media_stream': 2,
            'media_stream_mic': 2, 'media_stream_camera': 2, 'protocol_handlers': 2,
            'ppapi_broker': 2, 'automatic_downloads': 2, 'midi_sysex': 2,
            'push_messaging': 2, 'ssl_cert_decisions': 2, 'metro_switch_to_desktop': 2,
            'protected_media_identifier': 2, 'app_banner': 2, 'site_engagement': 2,
            'durable_storage': 2, 'stylesheets': 2}
    }
}

const logSeleniumErr = (error: any, origin: any) => {
    if (process.env.NODE_ENV === "dev")
        console.error("[SELENIUM]", origin, error);
}

const getSeleniumDriver = () => {
    let options = new Options().headless().windowSize({width: 1270, height: 700});
    if ((global as any).seleniumArgs != null) {
        options.addArguments((global as any).seleniumArgs.split(","));
    }
    options.setUserPreferences(chromeConfig)
    return new Builder().setChromeOptions(options).forBrowser("chrome").build();
}

/**
 * Extract all restaurant options from main view
 * @param driver Selenium driver
 */
async function getRestaurantList(driver: ThenableWebDriver) {
    let restaurantDropdown = await driver.findElement(By.id("MainContent_RestaurantDropDownList"))
    let restaurants:Restaurant[] = [];
    let options: WebElement[] = await restaurantDropdown.findElements(By.css("option"));
    for (let item of options.splice(1, options.length-1)) {
        try {
            let name = await item.getAttribute("textContent");
            if (name != null) {
                let id = await item.getAttribute("value");
                if (id != null) {
                    restaurants.push(new Restaurant(id, name));
                }
            }
        } catch (e) {
            logSeleniumErr(e, 4654);
        }
    }
    return restaurants
}

/**
 * Get all restaurant options directly from HTML code
 */
async function getRestaurantListFromUrl(url: string) {
    const httpResp: string = await new Promise((resolve, reject) => {
        httpClient.get(url, (fetchErr, fetchResp) => {
            if (fetchErr || fetchResp == undefined) {
                reject(fetchResp);
                return;
            }
            resolve(fetchResp.body);
        });
    })
    return parseRestaurants(httpResp);
}

/**
 * Select restaurant option from picker
 * @param driver Selenium driver
 * @param id ID for UI picker element
 */
async function selectRestaurant(driver: ThenableWebDriver, id: string) {
    const restaurants = await getRestaurantList(driver);
    let position = -1;
    restaurants.forEach((restaurant, index) => {
        if (restaurant.id == id) {
            // Adding one to index, because getRestaurantList removes first item, as it's not a restaurant
            position = index+1
        }
    });
    if (position === -1)
        throw new Error("Restaurant not found, check the ID");

    // Open picker
    let restaurantDropDown = await driver.findElement(By.id("MainContent_RestaurantDropDownList-button"));
    await restaurantDropDown.click();

    // Get picker options
    let restaurantList = await driver.findElement(By.id("MainContent_RestaurantDropDownList-menu"));
    let listItems = await restaurantList.findElements(By.css("li"));

    if (position > listItems.length-1) {
        throw new Error("Restaurant not found, check the ID");
    }
    // Navigate to restaurant
    let listItem = listItems[position];
    await listItem.click()
}

/**
 * Get link for PDF print, which contains menu ID
 *
 * Thank aromi food service (or CGI Finland) for making this function hell :D
 * @param driver Selenium Driver
 */
async function getRestaurantPDFLink(driver: ThenableWebDriver) {
    await driver.wait(elementLocated(By.id("MainContent_PdfUrl")));
    const pdfUrl = await driver.findElement(By.id("MainContent_PdfUrl"));
    let href = await pdfUrl.getAttribute("href");
    if (href == null) {
        // First selection item does not produce anything, choosing another one.
        let middleDateBtn = await driver.findElement(By.id("MainContent_RestaurantDateRangesFilterHeadersDataList_RestaurantDateRangesFilterHeadersLinkButton_1"));
        await middleDateBtn.click();

        let progressElem = await driver.wait(until.elementLocated(By.id("MainContent_UpdateProgress2")));
        await driver.wait(until.stalenessOf(progressElem));

        let pdfUrl = await driver.findElement(By.id("MainContent_PdfUrl"));
        // Wait until href attribute is valid
        await driver.wait(() => {
            return driver.findElement(By.id("MainContent_PdfUrl")).getAttribute("href").then(href => {return href != null});
        }, 3000)

        return (await pdfUrl.getAttribute("href"))
    } else {
        return href;
    }
}

/**
 * Get link for PDF print, which contains menu ID
 *
 * Compared to old method, this makes requests to ASPX endpoint and skips resource-intensive selenium brainfuck
 * Thank aromi food service (or CGI Finland or whoever the fuck runs this) for making life be such pain
 * @param url Selenium Driver
 * @param restaurantId Restaurant ID
 */
async function getRestaurantPDFLinkDirect(url: string, restaurantId: string) {
    const httpResp: {body: string, cookies: Cookies|undefined} = await new Promise((resolve, reject) => {
        httpClient.get(url, (fetchErr, fetchResp) => {
            if (fetchErr || fetchResp == undefined) {
                reject(fetchResp);
                return;
            }
            resolve({body: fetchResp.body, cookies: fetchResp.cookies});
        });
    })

    // Extract parameters for request
    const formParams = await extractFormParams(httpResp.body);

    // Make this unnecessary and fucked up request
    const data = await fetch(url, {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Haistka; Pska:) Saatana/20011109 CGIDevausTiimilleVitutJaPotkut/69.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "X-Requested-With": "XMLHttpRequest",
            "X-MicrosoftAjax": "Delta=true",
            "Cache-Control": "no-cache",
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Pragma": "no-cache",
            "Cookie": Object.keys(httpResp.cookies||{}).map(i => `${i}=${(httpResp.cookies||{})[i]}`).join("; ")
        },
        "body": `ctl00%24ScriptManager1=ctl00%24MasterUpdatePanel%7Cctl00%24MainContent%24RestaurantDropDownList&__EVENTTARGET=ctl00%24MainContent%24RestaurantDropDownList&__EVENTARGUMENT=&__LASTFOCUS=&__VIEWSTATE=${encodeURIComponent(formParams.get("__VIEWSTATE")||"")}&__VIEWSTATEGENERATOR=${formParams.get("__VIEWSTATEGENERATOR")}&__SCROLLPOSITIONX=0&__SCROLLPOSITIONY=0&__VIEWSTATEENCRYPTED=&__EVENTVALIDATION=${encodeURIComponent(formParams.get("__EVENTVALIDATION")||"")}&ctl00%24MainContent%24LanguagesDropDownList=fi&ctl00%24MainContent%24RestaurantTypeDropDownList=&ctl00%24MainContent%24RestaurantDropDownList=${restaurantId}&__ASYNCPOST=true&`,
        "method": "POST",
    });

    // Extract real name of the f*ing menu
    const str = await data.text();
    const commandStrip = (str.split("\n")[0]).split("|");
    const path = decodeURIComponent(commandStrip.find(i => i.includes("Restaurant.aspx"))||"");

    // Make URL to request, in order to get PDF Link :::DDD
    let newUrl = new URL(url);
    newUrl.pathname = path
    const pdfLinkRequest: string = await new Promise((resolve, reject) => {
        httpClient.get(newUrl.toString(), (fetchErr, fetchResp) => {
            if (fetchErr || fetchResp == undefined) {
                reject(fetchResp);
                return;
            }
            resolve(fetchResp.body);
        });
    })

    // Finally, make PDF URL
    const pdfPath = await extractRestaurantPDFLink(pdfLinkRequest)
    if (!pdfPath)
        return null
    return newUrl.toString().replace("Restaurant.aspx", pdfPath);
}

/**
 * Get restaurants from Aromi
 */
export async function getMenuOptions(req: Request, res: Response) {
    try {
        if (!req.params.url) {
            responseStatus(res, 400, false, {cause: 'URL not specified!'});
            return;
        }
        let url = req.params.url;
        let fullUrl = url.includes("aromiv2://");
        url = url.replace("aromiv2://", "https://");
        if (!url.match(urlRegex)) {
            responseStatus(res, 400, false, {cause: 'Invalid of malformed URL!'});
            return;
        }
        if (url.endsWith("/"))
            url = url.substr(0, url.length-1);
        let hashKey = HashUtils.sha1Digest(url+"_aroma");
        let cache = await userCache.getItem(hashKey);
        if (cache) {
            responseStatus(res, 200, true, {restaurants: cache});
        } else {
            let driver: ThenableWebDriver | null = null;
            let restaurants: Restaurant[]
            try {
                restaurants = await getRestaurantListFromUrl(url+(fullUrl ? "" : "/Default.aspx"));
            } catch (e) {
                console.log("Falling back to old method!", e);
                driver = getSeleniumDriver();
                await driver.get(url+(fullUrl ? "" : "/Default.aspx"));
                restaurants = await getRestaurantList(driver);
            }

            // Set cache
            await userCache.setItem(hashKey, restaurants, {ttl: 3600})
            responseStatus(res, 200, true, {restaurants});
            if (process.env.SKIP_SELENIUM_QUIT != "false") {
                setTimeout(() => {
                    try {driver?.close().catch(() => {})} catch (ignored) {}
                }, 500);
            }
        }
    } catch (error: any) {
        logSeleniumErr(error, "getMenuOptions")
        responseStatus(res, 500, false, {cause: error.toString()});
    }
}

/**
 * Get Restaurant data with meals
 * @param req
 * @param res
 */
export async function getRestaurantPage(req: Request, res: Response) {
    if (!req.params.url || !req.params.id) {
        responseStatus(res, 400, false, {cause: 'Required parameters not specified!'});
        return;
    }
    let url = req.params.url;
    let id = req.params.id;
    let fullUrl = url.includes("aromiv2://");
    url = url.replace("aromiv2://", "https://");
    if (!url.match(urlRegex)) {
        responseStatus(res, 400, false, {cause: 'Invalid of malformed URL!'});
        return;
    }
    if (url.endsWith("/"))
        url = url.substr(0, url.length-1);
    const fetchDocument = async (pdfUrl: string, driver: ThenableWebDriver|null) => {
        const fetchDate = async (date: string) : Promise<{ days: Day[], diets: Diet[] }> => {
            let rssFeedUrl = pdfUrl.replace("%dmd%", date).replace("Pdf.aspx", "Rss.aspx").replace("pdf.aspx", "rss.aspx");

            let httpResp = await new Promise((resolve, reject) => {
                httpClient.get(rssFeedUrl, (rssError, rssResponse) => {
                    if (rssError || rssResponse == undefined) {
                        reject(rssError);
                        return;
                    }
                    resolve(rssResponse.body);
                });
            })

            let rssRestaurants = await parseRSSFeed(httpResp)
            if (rssRestaurants == undefined) {
                // before throwing an error, try PDF file
                return await new Promise((resolve, reject) => {
                    httpClient.get(pdfUrl.replace("%dmd%", date), (error, response) =>  {
                        if (error || response == undefined) {
                            reject(error);
                            return
                        }
                        parse(response.body, (days, diets) => {
                            if (days == undefined || diets == undefined) {
                                reject(new Error("Unable to parse menu!"));
                                return;
                            }
                            resolve({days, diets});
                        });
                    });
                })
            }
            return {days: rssRestaurants, diets: []};
        }
        const contains = (item: string, items: Diet[]) => {
            let found = false;
            items.forEach(item2 => {
                if (item.toLowerCase() == item2.name.toLowerCase())
                    found = true;
            });
            return found;
        }
        // Now that performance issues are fixed, include next week
        let {days, diets} = await fetchDate("1");
        // Fetch next week, if it's necessary. Otherwise, skip it.
        if (days.filter(i => {return moment().isBefore(moment(i.date))}).length < 1) {
            let {days: days1, diets: diets1} = await fetchDate("2");
            days1.forEach(item => days.push(item));
            diets1.forEach(dItem => {if (!contains(dItem.name, diets)) {diets.push(dItem)}});
            responseStatus(res, 200, true, {menu: days, diets: diets});
        } else {
            responseStatus(res, 200, true, {menu: days, diets: diets});
        }
        if (driver != null && process.env.SKIP_SELENIUM_QUIT == "false") {
            setTimeout(() => {
                try {driver.close().catch(() => {})} catch (ignored) {}
            }, 500);
        }
    }

    try {
        let hashKey = HashUtils.sha1Digest(url+"_"+id);
        let cache = await userCache.getItem(hashKey);
        if (cache) {
            return (await fetchDocument(cache as string, null))
        } else {
            let pdfUrl: string|null = null
            let driver: ThenableWebDriver|null = null
            try {
                pdfUrl = await getRestaurantPDFLinkDirect(url+(fullUrl ? "" : "/Default.aspx"), id);
            } catch (e) {
                // From now on, selenium method is only kept as backup
                console.log(e);
                driver = getSeleniumDriver();
                try {
                    await driver.get(url+(fullUrl ? "" : "/Default.aspx"));
                    await selectRestaurant(driver, id)
                    pdfUrl = await getRestaurantPDFLink(driver);

                } catch (e) {
                    // Close driver before quitting request process
                    if (process.env.SKIP_SELENIUM_QUIT == "false") {
                        setTimeout(() => {
                            try {driver?.close().catch(() => {})} catch (ignored) {}
                        }, 500);
                    }
                    console.log(e);
                }
            }
            if (!pdfUrl) {
                responseStatus(res, 200, true, {menu: [], diets: []});
                return;
            }
            pdfUrl = pdfUrl.replace(/DateMode=[0-9]/, "DateMode=%dmd%");
            await userCache.setItem(hashKey, pdfUrl, {ttl: 3600*24})
            await fetchDocument(pdfUrl, driver)
        }
    } catch (error: any) {
        logSeleniumErr(error, "getRestaurantPage")
        responseStatus(res, 500, false, {cause: error.toString()});
    }
}
