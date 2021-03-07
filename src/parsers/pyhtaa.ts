/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Menu} from "../models/Menu";
import {Diet} from "../models/Diet";

const dateRegex = /([0-9]+).([0-9]+)/;

const type = "pyhtaa";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let items: Day[] = [];
    let card = document.querySelector("div[class=\"content\"]");
    if (card !== undefined) {
        let pElem = card.querySelectorAll("p");
        pElem.forEach(item => {
            let regexResult = dateRegex.exec(item.text);
            if (regexResult != null && regexResult[0] !== undefined) {
                let momentDate = moment(regexResult[0], "DD.MM").startOf('day');
                let date: any = momentDate.format();
                let meals: Meal[] = [];
                item.childNodes.splice(2, item.childNodes.length-1).forEach(item => {
                    if (item.text != "")
                        meals.push(new Meal(HashUtils.sha1Digest(type+"_"+item.text.trim()), item.text.trim()));
                });
                items.push(new Day(date, [new Menu("Lounas", meals)]));
            }
        });
        return {menu: items, diets: []};
    }
    return undefined;
}