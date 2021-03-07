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
const dietsRegex = /[A-Z+]=[a-z]+/;
const dietRegex = /[A-Z]+=.*/

const type = "steiner";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let items: Day[] = [];
    let diets: Diet[] = [];
    let dietCards = document.querySelectorAll("div[class=\"ce-textpic ce-right ce-intext\"]");
    dietCards.forEach(dietCard => {
        // I know, this might be most horrible line of code in this project, but it works :D, and I don't want to deal with these datanomi services any more seconds than I initially planned
        let content = dietCard.text.trim().replace("= ", "=").replace("= ", "=").replace(" =", "=").split(" ");
        content.forEach(item => {
            let regexResult = dietRegex.exec(item);
            if (regexResult != null) {
                for (let i = 0; i < regexResult.length; i++) {
                    let item = regexResult[i];
                    let split = item.split("=");
                    let code = split[0].trim();
                    let name = split[1].trim();
                    diets.push(new Diet(code, name));
                }
            }
        }) ;

    });
    let cards = document.querySelectorAll("div[class=\"ce-textpic ce-center ce-above\"]");
    if (cards !== undefined) {
        cards.forEach(card => {
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
        })
        return {menu: items, diets: diets};
    }
    return undefined;
}