/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {Moment} from "moment/moment";
import {Menu} from "../models/Menu";
import {HashUtils} from "../crypto/hash";
import {Diet} from "../models/Diet";
import {Meal} from "../models/Meal";

const dateRegex = /([0-9]+).([0-9]+).([0-9]{4})/;
const type = "phyk";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let contentBox = document.querySelector(".content-single-weekly-menu__entry");
    if (contentBox !== null) {
        let items: Day[] = [];
        let children = contentBox.querySelectorAll('*');
        let currentDayDate: undefined|Moment = undefined;
        children.forEach(child => {
            if (child.tagName.toLowerCase() === 'h2' && !currentDayDate) {
                let regexResult = dateRegex.exec(child.textContent);
                if (regexResult != null)
                    currentDayDate = moment(regexResult[0], "DD.MM.YYYY").startOf('day');
            } else if (child.tagName.toLowerCase() === 'ul' && currentDayDate !== undefined) {
                let meals: Meal[] = [];
                let mealLi = child.querySelectorAll('li');
                mealLi.forEach(meal => {
                    meal.textContent = meal.textContent.trim();
                    meals.push(new Meal(meal.textContent, HashUtils.sha1Digest(type+'_'+meal.textContent)));
                });
                items.push(new Day(currentDayDate.toISOString(true), [new Menu('Lounas', meals)]));
                currentDayDate = undefined;
            }
        });
        return {menu: items, diets: []};
    }
    return undefined;
}