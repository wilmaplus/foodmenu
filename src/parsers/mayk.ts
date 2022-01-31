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
const type = "mayk";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let contentBox = document.querySelector("#ruoka-viikko-wrapper");
    if (contentBox !== null) {
        let items: Day[] = [];
        let children = contentBox.querySelectorAll('.ruoka-template-header');
        let currentDayDate: undefined|Moment = undefined;
        children.forEach(child => {
            if (child.querySelector('.ruoka-header-pvm') && !currentDayDate) {
                let regexResult = dateRegex.exec(child.textContent);
                if (regexResult != null)
                    currentDayDate = moment(regexResult[0], "DD.MM.YYYY").startOf('day');
            } else if (child.querySelector('.ruoka-header-ruoka') && currentDayDate !== undefined) {
                let meals: Meal[] = [];
                let mealNormal = child.querySelector('.ruoka-header-ruoka')
                let mealPlant = child.querySelector('.ruoka-header-kasvisruoka')
                let mealAll = `${mealNormal.textContent}; ${mealPlant.textContent.replace(/  Kasvisruoka/g, "")}`

                meals.push(new Meal(mealAll, HashUtils.sha1Digest(type+'_'+mealAll)))
                items.push(new Day(currentDayDate.toISOString(true), [new Menu('Lounas', meals)]));
                currentDayDate = undefined;
            }
        });
        return {menu: items, diets: []};
    }
    return undefined;
}