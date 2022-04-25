/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Request, Response} from "express";
import {errorResponse, responseStatus} from "../utils/response_utilities";
import {Builder, By, ThenableWebDriver, until} from "selenium-webdriver";
import {Restaurant} from "../models/Restaurant";
import {AsyncIterator} from "../utils/iterator";
import {elementLocated} from "selenium-webdriver/lib/until";
import {Http} from "../net/http";
import {parse, parseRSSFeed} from "../parsers/aromiv2";
import {CacheContainer} from "node-ts-cache";
import {MemoryStorage} from "node-ts-cache-storage-memory";
import {HashUtils} from "../crypto/hash";
import {Day} from "../models/Day";
import {Diet} from "../models/Diet";
import {Options} from "selenium-webdriver/chrome";
import moment from "moment";

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
let httpClient = new Http();
let userCache = new CacheContainer(new MemoryStorage());

// Disable image loading to save
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
            'durable_storage': 2}
    }
}


function getRestaurantList(driver: ThenableWebDriver) {
    return new Promise<Restaurant[]>((resolve, reject) => {
        driver.findElement(By.id("MainContent_RestaurantDropDownList")).then(element => {
            let restaurants:Restaurant[] = [];
            element.findElements(By.css("option")).then(options => {
                new AsyncIterator((item, iterator) => {
                    item.getAttribute("textContent").then(name => {
                        if (name != null) {
                            item.getAttribute("value").then(id => {
                                if (id != null) {
                                    restaurants.push(new Restaurant(id, name));
                                    iterator.nextItem();
                                } else
                                    iterator.nextItem();
                            }).catch(() => {
                                iterator.nextItem();
                            });
                        } else
                            iterator.nextItem();
                    }).catch(() => {
                        iterator.nextItem();
                    });
                }, options.splice(1, options.length-1), () => {
                    resolve(restaurants);
                }).start();
            }).catch(error => {
                reject(error);
            });
        }).catch(error => {
            reject(error);
        });
    });

}

function selectRestaurant(driver: ThenableWebDriver, id: string) {
    return new Promise<void>((resolve, reject) =>  {
        getRestaurantList(driver).then(restaurants => {
            let position = -1;
            restaurants.forEach((restaurant, index) => {
                if (restaurant.id == id) {
                    // Adding one to index, because getRestaurantList removes first item, as it's not a restaurant
                    position = index+1
                }
            });
            if (position === -1) {
                reject(new Error("Restaurant not found, check the ID"));
                return;
            }
            driver.findElement(By.id("MainContent_RestaurantDropDownList-button")).then(button => {
                button.click().then(() => {
                    driver.findElement(By.id("MainContent_RestaurantDropDownList-menu")).then(dropDown => {
                        dropDown.findElements(By.css("li")).then(listItems => {
                            if (position > listItems.length-1) {
                                reject(new Error("Restaurant not found, check the ID"));
                                return;
                            }
                            let listItem = listItems[position];
                            listItem.click().then(() => {
                                resolve();
                            }).catch(error => {
                                reject(error);
                            });
                        }).catch(error => {
                            reject(error);
                        });
                    }).catch(error => {
                        reject(error);
                    });
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        }).catch(error => {
            reject(error);
        });
    });

}

/**
 * Thank aromi food service (or CGI) for making this promise hell :D
 * @param driver
 */
function getRestaurantPDFLink(driver: ThenableWebDriver) {
    return new Promise<string>((resolve, reject) => {
        driver.wait(elementLocated(By.id("MainContent_PdfUrl"))).then(() => {
            driver.findElement(By.id("MainContent_PdfUrl")).then(pdfUrl => {
                pdfUrl.getAttribute("href").then(url => {
                    if (url == null) {
                        driver.findElement(By.id("MainContent_RestaurantDateRangesFilterHeadersDataList_RestaurantDateRangesFilterHeadersLinkButton_1")).then(item => {
                            item.click().then(() => {
                                driver.wait(until.elementLocated(By.id("MainContent_UpdateProgress2"))).then((element) => {
                                    driver.wait(until.stalenessOf(element)).then(() => {
                                        driver.findElement(By.id("MainContent_PdfUrl")).then(pdfUrl => {
                                            pdfUrl.getAttribute("href").then(url => {
                                                resolve(url);
                                            }).catch(error => {
                                                reject(error);
                                            });
                                        }).catch(error => {
                                            reject(error);
                                        });
                                    }).catch(error => {
                                        reject(error);
                                    });
                                }).catch(error => {
                                    reject(error);
                                });
                            }).catch(error => {
                                reject(error);
                            });
                        }).catch(error => {
                            reject(error);
                        });
                    } else {
                        resolve(url);
                    }
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        }).catch(error => {
            reject(error);
        });
    });
}

export function getMenuOptions(req: Request, res: Response) {
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
    userCache.getItem(hashKey).then(cachedValue => {
        if (cachedValue) {
            responseStatus(res, 200, true, {restaurants: cachedValue});
        } else {
            let options = new Options().headless().windowSize({width: 700, height: 100});
            if ((global as any).seleniumArgs != null) {
                options.addArguments((global as any).seleniumArgs.split(","));
            }
            options.setUserPreferences(chromeConfig)
            const driver = new Builder().setChromeOptions(options).forBrowser("chrome").build();
            driver.get(url+(fullUrl ? "" : "/Default.aspx")).then(() => {
                getRestaurantList(driver).then(restaurants => {
                    userCache.setItem(hashKey, restaurants, {ttl: 3600}).then(() => {
                        responseStatus(res, 200, true, {restaurants});
                        driver.close();
                    }).catch(error => {
                        responseStatus(res, 500, false, {cause: error.toString()});
                        driver.close();
                    });
                }).catch(error => {
                    responseStatus(res, 500, false, {cause: error.toString()});
                    driver.close();
                });
            }).catch(error => {
                responseStatus(res, 500, false, {cause: error.toString()});
                driver.close();
            });
        }
    }).catch(error => {
        responseStatus(res, 500, false, {cause: error.toString()});
    });

}

export function getRestaurantPage(req: Request, res: Response) {
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
    if (!url.match(urlRegex)) {
        responseStatus(res, 400, false, {cause: 'Invalid of malformed URL!'});
        return;
    }
    if (url.endsWith("/"))
        url = url.substr(0, url.length-1);
    const fetchDocument = (pdfUrl: string) => {
        const fetchDate = (date: string, callback: (restaurants: Day[], diets: Diet[]) => void, errorCallback: (error: Error | null) => void) => {
            let rssFeedUrl = pdfUrl.replace("%dmd%", date).replace("Pdf.aspx", "Rss.aspx").replace("pdf.aspx", "rss.aspx");

            httpClient.get(rssFeedUrl, (rssError, rssResponse) => {
                if (rssError || rssResponse == undefined) {
                    errorCallback(rssError);
                    return;
                }
                parseRSSFeed(rssResponse.body, (rssRestaurants) => {
                    if (rssRestaurants == undefined) {
                        // before throwing an error, try PDF file
                        httpClient.get(pdfUrl.replace("%dmd%", date), (error, response) =>  {
                            if (error || response == undefined) {
                                errorCallback(error);
                                return;
                            }
                            parse(response.body, (restaurants, diets) => {
                                if (restaurants == undefined || diets == undefined) {
                                    errorCallback(new Error("Unable to parse menu!"));
                                    return;
                                }
                                callback(restaurants, diets);
                            });
                        });
                        return;
                    }
                    callback(rssRestaurants, []);
                })
            });
        };
        const contains = (item: string, items: Diet[]) => {
            let found = false;
            items.forEach(item2 => {
                if (item.toLowerCase() == item2.name.toLowerCase())
                    found = true;
            });
            return found;
        }
        // Now that performance issues are fixed, include next week
        fetchDate("1", (restaurants, diets) => {
            // Fetch next week, if it's necessary. Otherwise, skip it.
            if (restaurants.filter(i => {return moment() > i.date}).length < 1) {
                fetchDate("2", ((restaurants1, diets1) => {
                    restaurants1.forEach(item => restaurants.push(item));
                    diets1.forEach(dItem => {if (!contains(dItem.name, diets)) {diets.push(dItem)}});
                    responseStatus(res, 200, true, {menu: restaurants, diets: diets});
                }), error => {
                    errorResponse(res, 500, error);
                    return;
                });
            } else {
                responseStatus(res, 200, true, {menu: restaurants, diets: diets});
            }
        }, error => {
            errorResponse(res, 500, error);
            return;
        })
    }
    let hashKey = HashUtils.sha1Digest(url+"_"+id);
    userCache.getItem(hashKey).then(value => {
        // Check if cached value exists
        if (value)
            fetchDocument(value as string);
        else {
            let options = new Options()/*.headless()*/.windowSize({width: 700, height: 100});
            if ((global as any).seleniumArgs != null) {
                options.addArguments((global as any).seleniumArgs.split(","));
            }
            options.setUserPreferences(chromeConfig)
            const driver = new Builder().setChromeOptions(options).forBrowser("chrome").build();
            driver.get(url+(fullUrl ? "" : "/Default.aspx")).then(() => {
                selectRestaurant(driver, id).then(() => {
                    getRestaurantPDFLink(driver).then(pdfUrl => {
                        driver.close();
                        if (pdfUrl == null) {
                            responseStatus(res, 200, true, {menu: [], diets: []});
                            return;
                        }
                        pdfUrl = pdfUrl.replace(/DateMode=[0-9]/, "DateMode=%dmd%");
                        userCache.setItem(hashKey, pdfUrl, {ttl: 3600}).then(() => {
                            fetchDocument(pdfUrl);
                        }).catch(error => {
                            responseStatus(res, 500, false, {cause: error.toString()});
                        });
                    }).catch(error => {
                        responseStatus(res, 500, false, {cause: error.toString()});
                        driver.close();
                    });
                }).catch(error => {
                    responseStatus(res, 500, false, {cause: error.toString()});
                    driver.close();
                });
            }).catch(error => {
                responseStatus(res, 500, false, {cause: error.toString()});
                driver.close();
            });
        }
    })

}