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

const dateRegex = /[0-9]+.[0-9]+.[0-9]{4}/;
const whitespace = " ";

const type = "krtpl";

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
        case 'lauantai':
            return 'saturday';
        case 'sunnuntai':
            return 'sunday';
        default:
            return '';
    }
}

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let items: Day[] = [];
    let diets: Diet[] = [];
    let weeks = document.querySelectorAll(".lunch-container");
    weeks.forEach(weekBox => {
        let weekNum = weekBox.querySelector('.lunch-current-week-num').text.trim() || undefined;
        let dietsHtml = weekBox.querySelector('.shortcuts');
        // Parse diets
        if (diets.length < 1 && dietsHtml !== undefined) {
            let splittedDiets = dietsHtml.text.trim().split(", ");
            splittedDiets.forEach(splittedDiet => {
               let dietParts =  splittedDiet.split(" = ");
               diets.push(new Diet(dietParts[0], dietParts[1]));
            })
        }
        if (weekNum !== undefined) {
            let foodBox = weekBox.querySelectorAll('.col-md-12');
            foodBox.forEach(food => {
                if (weekNum !== undefined)  {
                    let timestamp = moment().week(parseInt(weekNum)+1).day(convertDayName(food.classNames[food.classNames.length-1])).startOf('day');
                    let txtRows = food.querySelectorAll('p');
                    let combinedContent = '';
                    txtRows.forEach(content => {
                        combinedContent += content.text+'\n';
                    });
                    items.push(new Day(timestamp.toISOString(true), [{name: 'Lounas', meals: [new Meal(HashUtils.sha1Digest(type+"_"+combinedContent.trim()), combinedContent)]}]))
                }
            })
        }
    });
    return {menu: items, diets};
}