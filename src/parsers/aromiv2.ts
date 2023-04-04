/*
 * Copyright (c) 2022 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import moment from 'moment';
import {Day} from "../models/Day";
import {Menu} from "../models/Menu";
import {Moment} from "moment/moment";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Diet} from "../models/Diet";
import {removeImagesFromPDF} from "../utils/pdf";
import * as parser from "node-html-parser";
import {Restaurant} from "../models/Restaurant";

const pdfParser = require("pdfreader");

const dateRegex = /[0-9]+\.[0-9]+\.[0-9]{4}/;

const type = "aromiv2";

export async function parseRestaurants(html: string) {
    let restaurants:Restaurant[] = [];
    let document = parser.parse(html);
    let optionsHtml = document.querySelectorAll('select#MainContent_RestaurantDropDownList>option:not([value=""])');
    optionsHtml.forEach(link => {restaurants.push(new Restaurant(link?.attrs?.value, link?.text))});
    return restaurants;
}

export async function extractFormParams(html: string) {
    let document = parser.parse(html);
    return new Map(document.querySelectorAll("input").map(e => [e?.attrs?.name, e?.attrs?.value]));
}

export async function extractRestaurantPDFLink(html: string) {
    let document = parser.parse(html);
    return document.querySelector("#MainContent_PdfUrl")?.attrs?.href;
}

/**
 * Parse PDF document and extract all menu items
 * @param content PDF content
 * @param callback Callback function
 */
export async function parse(content: any, callback: (content: Day[]|undefined, diets: Diet[]|undefined) => void) {
    let rows: any = {}; // indexed by y-position
    let days: Day[] = [];
    let diets: Diet[] = [];
    // Due to a bug in PDF parser, images cause it not to parse any text.
    // Removing images before parsing helps to circumvent this issue, until dev behind the lib fixes that issue,
    try {
        content = await removeImagesFromPDF(content);
    } catch (e) {
        console.error(e);
    }
    new pdfParser.PdfReader().parseBuffer(content, (pdfError: {parserError: string}, pdf: any) => {
        if (pdfError) {
            // This error occurs when menu is empty
            if (pdfError.parserError.toLowerCase().includes("bad xref entry")) {
                callback([], []);
                return;
            }
            console.error(pdfError);
            callback(undefined, undefined);
            return;
        }
        if (!pdf || pdf.page) {
            let items = Object.keys(rows).sort((y1, y2) => parseFloat(y1) - parseFloat(y2));
            let lastDate: Moment|null = null;
            let tempMenuList:Menu[] = [];
            let mealType = "Lounas";
            let tmpItems: Meal[] = [];
            let tmpContent = '';
            items.forEach(key => {
                let item = rows[key];
                if (item.length > 0) {
                    let firstEntry = item[0];
                    if (firstEntry.text.match(dateRegex)) {
                        // Date found
                        if (tmpContent.length > 0) {
                            tmpItems.push(new Meal(HashUtils.sha1Digest(type+mealType+"_"+tmpContent), tmpContent));
                            tmpContent = '';
                        }
                        if (tmpItems.length > 0) {
                            tempMenuList.push(new Menu(mealType, tmpItems));
                            tmpItems = [];
                        }
                        let regexResult = dateRegex.exec(firstEntry.text);
                        if (regexResult != null) {
                            if (tempMenuList.length > 0 && lastDate != null) {
                                days.push(new Day(lastDate, tempMenuList));
                                tempMenuList = [];
                            }
                            lastDate = moment(regexResult[0], "DD.MM.YYYY").startOf('day');
                        }
                    } else if (lastDate != null) {

                        for (let meal of item) {
                            if (meal.x < 3 && meal.x > 1) {
                                if (tmpContent.length > 0) {
                                    tmpItems.push(new Meal(HashUtils.sha1Digest(type+mealType+"_"+tmpContent), tmpContent));
                                    tmpContent = '';
                                }
                                if (tmpItems.length > 0) {
                                    tempMenuList.push(new Menu(mealType, tmpItems));
                                    tmpItems = [];
                                }
                                mealType = meal.text;
                            } else if (meal.x > 4) {
                                tmpContent += meal.text;
                            }
                        }

                    }
                }
            });
            if (tmpContent.length > 0) {
                tmpItems.push(new Meal(HashUtils.sha1Digest(type+mealType+"_"+tmpContent), tmpContent));
                tmpContent = '';
            }
            if (tmpItems.length > 0) {
                tempMenuList.push(new Menu(mealType, tmpItems));
                tmpItems = [];
            }
            if (tmpItems.length > 0) {
                if (tmpContent.length > 0)
                    tmpItems.push(new Meal(HashUtils.sha1Digest(type+mealType+"_"+tmpContent), tmpContent));
                tempMenuList.push(new Menu(mealType, tmpItems));
                tmpItems = [];
            }
            if (tempMenuList.length > 0 && lastDate != null) {
                days.push(new Day(lastDate, tempMenuList));
                tempMenuList = [];
            }
            try {
                if (items.length > 0) {
                    let dietsText = rows[items[items.length-1]][0].text;
                    let dietSplit = dietsText.split(", ")
                    for (let dietItem of dietSplit) {
                        let parts = dietItem.split(" - ");
                        if (parts.length > 1) {
                            diets.push(new Diet(parts[0], parts[1]));
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            }
            if (!pdf) {
                days.sort((i1: Day, i2:Day) => {
                    return i1.date.unix()-i2.date.unix();
                });
                // Formatting date after sorting
                let correctedDateDays = days;
                correctedDateDays.forEach((item, index) => {
                    item.date = (item.date.format() as any);
                    correctedDateDays[index] = item;
                });
                callback(correctedDateDays, diets);
            }
        } else if (pdf.text) {
            // accumulate text items into rows object, per line
            (rows[pdf.y] = rows[pdf.y] || []).push({text: pdf.text, x: pdf.x});
        }
    });
}

/**
 * Parse RSS feed content and extract menu info
 * @param content RSS feed content
 */
export async function parseRSSFeed(content: any) {
    try {
        if (content && content.name === 'rss' && content.children.filter((i: any) => {return i.name === 'channel'})) {
            let channel = content.children.filter((i: any) => {return i.name === 'channel'})[0];
            let items = channel.children.filter((i: any) => {return i.name === 'item'});
            let days: Day[] = [];
            for (let item of items) {
                let title = item.children.filter((i: any) => i.name === 'title');
                let desc = item.children.filter((i: any) => i.name === 'description');
                let id = item.children.filter((i: any) => i.name === 'guid');
                if (title && desc) {
                    title = title[0].value;
                    desc = desc[0].value;
                    id = id[0]?.value
                    let tempMenuList: Menu[] = [];
                    // Items parser
                    for (let subItem of desc.split('<br>')) {
                        let split = subItem.split(':');
                        let name = split[0].trim();
                        if (name[name.length-1] === ".")
                            name = name.slice(0,-1);
                        let value = split[1].trimStart();
                        tempMenuList.push(new Menu(name, [new Meal(HashUtils.sha1Digest(type+name+'_'+value), value)]))
                    }
                    // Parse date
                    if (title.match(dateRegex)) {
                        let dateResults = dateRegex.exec(title);
                        if (dateResults) {
                            let date = moment(dateResults[0], "DD.MM.YYYY").startOf('day');
                            days.push(new Day(date, tempMenuList))
                        }
                    }
                }
            }
            return days;
        }
        return undefined
    } catch (e) {
        console.error(e);
        return undefined;
    }
}
