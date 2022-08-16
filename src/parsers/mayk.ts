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

const dateRegex = /\b[A-Z].*?\b/;
const type = "mayk";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let contentBox = document.querySelector(".ruoka-template");
    if (contentBox !== null) {
        let items: Day[] = [];
        let children = document.querySelectorAll('.ruoka-template-header');
        let currentDayDate: undefined|Moment = undefined;

        children.forEach(child => {
            if (child.classNames.toLowerCase() === 'ruoka-header-pvm') {
                let regexResult = dateRegex.exec(child.textContent);
                if (regexResult != null)
                    currentDayDate = moment(regexResult[0]);
            } else {
                let meals: Meal[] = [];
                let mealNormal = child.querySelectorAll('.ruoka-header-ruoka');
                mealNormal.forEach(meal => {
                    meal.textContent = meal.textContent.trim();
                    meals.push(new Meal(HashUtils.sha1Digest(type+'_'+meal.textContent), meal.textContent));
                });
                let mealVege = child.querySelectorAll('.ruoka-header-kasvisruoka');
                mealVege.forEach(meal => {
                    meal.textContent = meal.textContent.trim();
                    meals.push(new Meal(HashUtils.sha1Digest(type+'_'+meal.textContent), 
                        meal.textContent.replace(/\s+Kasvisruoka/g, "")));
                });
                items.push(new Day(currentDayDate?.toISOString(true), [new Menu('Lounas', meals)]));
                currentDayDate = undefined;
            }
        });
        return {menu: items, diets: []};
    }
    return undefined;
}