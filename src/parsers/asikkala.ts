/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Menu} from "../models/Menu";

const dateRegex = /[0-9]+.[0-9]+.[0-9]{4}/;
const whitespace = " ";

const type = "asikkala";

export function parse(html: string): Day[]|undefined {
    let document = parser.parse(html);
    let article = document.querySelector("article");
    if (article !== undefined) {
        let items: Day[] = [];
        let pElem = article.querySelectorAll("p");
        let begin = false;
        let date: any = null;
        let meals: Meal[] = [];
        let menuName: string = "";
        pElem.forEach(item => {
            if (!begin) {
                item.childNodes.forEach(node => {
                    let regexResult = dateRegex.exec(node.text);
                    if (regexResult != null && regexResult[0] !== undefined) {
                        let item = regexResult[0];
                        date = moment(item, 'DD.MM.YYYY').startOf('day').format();
                        begin = true;
                        console.log({begin, date});
                    }
                });
                if (begin) {
                    menuName = item.lastChild.text.trim();
                }
            } else {
                if (item.text !== whitespace) {
                    meals.push(new Meal(HashUtils.sha1Digest(type+"_"+item.text.trim()), item.text));
                } else {
                    // Push and reset
                    items.push(new Day(date, [new Menu(menuName, meals)]))
                    meals = [];
                    date = null;
                    begin = false;
                }
            }
        });
        return items;
    }
    return undefined;
}