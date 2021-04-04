/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Menu} from "../models/Menu";

const dateRegex = /([0-9]+).([0-9]+)/;

const type = "syk";

export function parse(html: string): Day[]|undefined {
    let document = parser.parse(html);
    let card = document.querySelector("div[class='secondary-bg-border']");
    if (card !== undefined) {
        let items: Day[] = [];
        let pElem = card.querySelectorAll("*");
        let begin = false;
        let date: any = null;
        let meals: Meal[] = [];
        pElem.forEach(item => {
            if (!begin && item.tagName.toLowerCase() == "h6") {
                item.childNodes.forEach(node => {
                    let regexResult = dateRegex.exec(node.text);
                    if (regexResult != null) {
                        let momentDate = moment(regexResult[0], "DD.MM").startOf('day');
                        date = momentDate.format();
                        begin = true;
                    }
                });
            } else if (begin && item.tagName.toLowerCase() == "ul") {
                let mealText = item.querySelector("li span[style=\"color: #f0a519;\"]");
                if (mealText != null) {
                    mealText = mealText.parentNode.parentNode.parentNode;
                    let splitContent = mealText.text.split(":");
                    if (splitContent.length > 1) {
                        let content = splitContent[1].trim();
                        meals.push(new Meal(HashUtils.sha1Digest(type+"_"+content), content));
                        items.push(new Day(date, [new Menu(splitContent[0], meals)]))
                        meals = [];
                        date = null;
                        begin = false;
                    }
                }
            }
        });
        return items;
    }
    return undefined;
}