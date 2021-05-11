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
import he from 'he';

const dateRegex = /\(([0-9]+).([0-9]+).([0-9]{4})\)/;
const dietRegex = /([A-Z]+) = (.*)/
const type = "tyk_yk";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let textBox = document.querySelector("div[class=\"text\"]");
    if (textBox !== null) {
        let items: Day[] = [];
        let diets: Diet[] = [];
        let childElements = textBox.querySelectorAll('*');
        let state: {activeWeek: boolean, currentWeekDate: undefined|Moment, currentWeekPos: number} = {activeWeek: false, currentWeekDate: undefined, currentWeekPos: 0};
        childElements.forEach(i => {
            if (i.tagName.toLowerCase() === 'p') {
                if (!state.activeWeek) {
                    let regexResult = dateRegex.exec(i.textContent);
                    if (regexResult != null) {
                        state.currentWeekDate = moment(regexResult[0], "DD.MM.YYYY").startOf('day');
                        state.activeWeek = true;
                        state.currentWeekPos = 0;
                    } else if (i.textContent.match(dietRegex) && diets.length < 1) {
                        i.textContent.split('\n').forEach(dietRow => {
                            let dietRegexResult = dietRegex.exec(dietRow);
                            if (dietRegexResult !== null && dietRegexResult.length > 2)
                                diets.push(new Diet(dietRegexResult[1], dietRegexResult[2]));
                        });
                    }
                } else if (state.currentWeekDate !== undefined && i.querySelector('strong') === null) {
                    if (state.currentWeekPos !== 0)
                        state.currentWeekDate.add(1, 'days');
                    state.currentWeekPos++;
                    let correctedContent = he.decode(i.textContent).trim();
                    items.push(new Day(state.currentWeekDate.toISOString(true), [new Menu('Lounas', [{name: correctedContent, id: HashUtils.sha1Digest(type+'_'+correctedContent)}])]));
                }
            } else if (i.tagName.toLowerCase() === 'hr') {
                // Week ended!
                state.activeWeek = false;
            }
        });
        return {menu: items, diets: diets};
    }
    return undefined;
}