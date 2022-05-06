/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */


import {Day} from "../models/Day";
import {Diet} from "../models/Diet";
import * as parser from "node-html-parser";
import moment from "moment";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Menu} from "../models/Menu";
import {ISSRestaurant} from "../models/iss/ISSRestaurant";

const dateRegex = /([0-9]+).([0-9]+)/;


export function parse(html: string, type: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    // Correcting heart icon
    let sm = document.querySelectorAll("i[class=\"sydanmerkki\"]");
    for (let smIcon of sm) {
        if (smIcon != null)
            smIcon.set_content("❤");
    }
    let items: Day[] = [];
    let cards = document.querySelectorAll("div[class^=\"lunch-menu__day\"]").slice(1);
    if (cards !== undefined) {
        for (let card of cards) {
            let pElem = card.querySelectorAll("p");
            let dateElem = card.querySelector("h2");

            let date:any = null;
            let regexResult = dateRegex.exec(dateElem.text);
            if (regexResult != null && regexResult[0] !== undefined) {
                let momentDate = moment(regexResult[0], "DD.MM").startOf('day');
                date = momentDate.format();
            }

            let meals: Meal[] = [];
            pElem.forEach(item => {
                meals.push(new Meal(HashUtils.sha1Digest(type+"_"+item.text.trim()), item.text));
            });

            if (date != null)
                items.push(new Day(date, [new Menu("Lounas", meals)]));
        }
        // Get nutrition details
        let nutritionDiv = document.querySelector("div[class=\"nutrition-details\"]");
        let nutritionText = nutritionDiv.querySelector("p");

        // Sort by date to fix sorting if multiple weeks are present. Parser does not follow orders
        // specified in HTML, so we fix that by manually sorting all items by date.
        items.sort((a, b) => {
            return new Date(a.date).getTime()-new Date(b.date).getTime();
        });

        let diets: Diet[] = [];
        for (let item of nutritionText.text.split(",")) {
            let split = item.split("=");
            let code = split[0].trim();
            let name = split[1].trim();
            diets.push(new Diet(code, name));
        }
        return {menu: items, diets: diets};
    }
    return undefined;
}

export function parseList(html: string): ISSRestaurant[] {
    let document = parser.parse(html);
    let links = document.querySelectorAll("a[class=\"ravintola__link\"]");
    let list: ISSRestaurant[] = [];
    links.forEach(item => {
        list.push(new ISSRestaurant(item.getAttribute('href'), item.text.trim()));
    })
    return list;
}
