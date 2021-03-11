/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Menu} from "../models/Menu";
import {errorResponse} from "../utils/response_utilities";
const pdfParser = require("pdfreader");

const dateRegex = /[0-9]+\.[0-9]+\.[0-9]{4}/;
const whitespace = " ";

const type = "loviisa_pk";

export function parsePDFLink(html: string): string|undefined {
    let document = parser.parse(html);
    let urlBox = document.querySelector("section[class='widget sidebar-lift']");
    let links = urlBox.querySelector("a");
    return links.getAttribute("href");
}

export function parse(content: any, callback: (content: Day[]|undefined) => void) {
    let rows: any = {}; // indexed by y-position
    let days: Day[] = [];
    new pdfParser.PdfReader().parseBuffer(content, (pdfError: Error, pdf: any) => {
        if (pdfError) {
            callback(undefined);
            return;
        }
        if (!pdf || pdf.page) {
            let items = Object.keys(rows).sort((y1, y2) => parseFloat(y1) - parseFloat(y2));
            let weekStarted = false;
            let weeks: number[] = [];
            let meals: {day: string, meal: string|null, valipala: string|null}[] = [];
            let weekBundles: { weeks: number[]; meals: { day: string; meal: string | null; valipala: string | null; }[]; }[] = [];
            items.slice(1, items.length).forEach(key => {
                let item = rows[key];
                if (item.length > 0) {
                    if (item[0].text.includes("viikko")) {
                        // Found week
                        if (weekStarted) {
                            weekBundles.push({weeks, meals});
                            weeks = [];
                            meals = [];
                        } else
                            weekStarted = true;

                        let cleanWeeks = item[0].text.replace("viikko", "").trim().split(",");
                        cleanWeeks.forEach((weekNum: string) => {
                            weeks.push(parseInt(weekNum.trim()));
                        });
                    } else if (weekStarted) {
                        let weekDay = null;
                        let meal: string|null = null;
                        let valipala: string|null = null;
                        item.forEach((rowCol: { x: number; text: string;}) => {
                            if (rowCol.x < 4 && rowCol.x > 2) {
                                // Weekday
                                weekDay = rowCol.text;
                            } else if (rowCol.x > 3.5 && rowCol.x < 5) {
                                meal = rowCol.text;
                            } else if (rowCol.x > 10) {
                                valipala = rowCol.text;
                            }
                        });
                        if (weekDay != null) {
                            meals.push({day: weekDay, meal, valipala});
                        }
                    }
                }
            });
            weekBundles.forEach(bundle => {
                bundle.weeks.forEach(week  => {
                    bundle.meals.forEach(meal => {
                        let momentDate = moment().startOf('day');
                        console.log({m: moment().week(), w2: week});
                        momentDate.set('week', week);
                        switch (meal.day.toLowerCase()) {
                            case 'ma':
                                momentDate.set('weekday', 1);
                                break;
                            case 'ti':
                                momentDate.set('weekday', 2);
                                break;
                            case 'ke':
                                momentDate.set('weekday', 3);
                                break;
                            case 'to':
                                momentDate.set('weekday', 4);
                                break;
                            case 'pe':
                                momentDate.set('weekday', 5);
                                break;
                            case 'la':
                                momentDate.set('weekday', 6);
                                break;
                            case 'su':
                                momentDate.set('weekday',0);
                                break;
                        }
                        let mainMeals = [];
                        if (meal.meal)
                            mainMeals.push(new Meal(HashUtils.sha1Digest(type+"_main_"+meal.meal), meal.meal));
                        if (meal.valipala) {
                            days.push(new Day(momentDate, [new Menu("Lounas", mainMeals), new Menu("Välipala", [new Meal(HashUtils.sha1Digest(type+"_välipala_"+meal.valipala), meal.valipala)])]));
                        } else {
                            days.push(new Day(momentDate, [new Menu("Lounas", mainMeals)]));
                        }

                    });
                });
            });
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
                callback(correctedDateDays);
            }
        } else if (pdf.text) {
            // accumulate text items into rows object, per line
            (rows[pdf.y] = rows[pdf.y] || []).push({text: pdf.text, x: pdf.x});
        }
    });
}