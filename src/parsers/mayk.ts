/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import { Day } from "../models/Day";
import { Moment } from "moment/moment";
import { Menu } from "../models/Menu";
import { HashUtils } from "../crypto/hash";
import { Diet } from "../models/Diet";
import { Meal } from "../models/Meal";

const dateRegex = /\b[A-Z].*?\b/;
const weekRegex = /\d+/;
const type = "mayk";

function convertDayName(name: string) {
    switch (name) {
        case 'maanantai':
            return 'monday';
        case 'tiistai':
            return 'tuesday';
        case 'keskiviikko':
            return 'wednesday';
        case 'torstai':
            return 'thursday';
        case 'perjantai':
            return 'friday';
        default:
            return '';
    }
}

export function parse(html: string): { menu: Day[], diets: Diet[] } | undefined {
    let document = parser.parse(html);

    let currentDayDate: undefined | Moment = undefined;
    let week = document.querySelector(".ruokalista-viikko").textContent;
    let weekResult = dateRegex.exec(week);

    let contentBox = document.querySelector(".ruoka-template");
    if (contentBox !== null) {
        let items: Day[] = [];
        let weekdays: string[] = [];
        let children = document.querySelectorAll('.ruoka-template-header');

        children.forEach(child => {
            let days = child.querySelectorAll('.ruoka-header-pvm');
            days.forEach(day => {
                let regexResult = dateRegex.exec(day.textContent)

                if (regexResult != null && weekResult != null) {
                    weekdays.push(regexResult[0]);

                    for (let i = 0; i < weekdays.length; i++) {
                        let newDay = convertDayName(weekdays[i].toLowerCase());
                        
                        currentDayDate = moment().day(newDay).week(parseInt(weekResult[0])).startOf('day');
                    }
                }
            })

            let meals: Meal[] = [];
            let mealNormal = child.querySelectorAll('.ruoka-header-ruoka');
            mealNormal.forEach(meal => {
                meal.textContent = meal.textContent.trim();
                meals.push(new Meal(HashUtils.sha1Digest(type + '_' + meal.textContent), meal.textContent));
            });

            let mealVege = child.querySelectorAll('.ruoka-header-kasvisruoka');
            mealVege.forEach(meal => {
                meal.textContent = meal.textContent.trim();
                meals.push(new Meal(HashUtils.sha1Digest(type + '_' + meal.textContent),
                    meal.textContent.replace(/\s+Kasvisruoka/g, "")));
            });
            items.push(new Day(currentDayDate?.toISOString(true), [new Menu('Lounas', meals)]));
            currentDayDate = undefined;
        });
        return { menu: items, diets: [] };
    }
    return undefined;
}