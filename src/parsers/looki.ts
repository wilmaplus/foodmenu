/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";
import {Diet} from "../models/Diet";
import {Menu} from "../models/Menu";

const type = "looki";
const dateRegex = /[0-9]{2}.[0-9]{2}.[0-9]+/;
const groupRegex = /(.*):/;
const dietsRegex = /(.*?) \((.*?)\)/;

export function parseLinks(html: string): string[] {
    let document = parser.parse(html);
    let links: string[] = [];
    let linksHtml = document.querySelectorAll('a');
    linksHtml.forEach(link => {links.push(link.attributes.href)});
    return links;
}

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let items: Day[] = [];
    let diets: Diet[] = [];
    let wrap = document.querySelectorAll('div[data-element_type="widget"]');
    let currentDate: any = undefined;
    let currentBasicContent = '';
    let tempMenus: Menu[] = [];
    let dividerPassed = false;
    wrap.forEach(wrapBox => {
        if (wrapBox.querySelector('div[class="elementor-divider"]')) {
            dividerPassed = true;
        }
        let boxContent = wrapBox.text.trim();
        if (!dividerPassed) {
            if (boxContent.match(dateRegex)) {
                if (currentBasicContent.length > 0) {
                    items.push(new Day(currentDate, [{name: 'Lounas', meals: [new Meal(HashUtils.sha1Digest(type+currentBasicContent), currentBasicContent)]}]));
                    currentBasicContent = '';
                } else if (tempMenus.length > 0) {
                    items.push(new Day(currentDate, tempMenus));
                    tempMenus = [];
                }
                let dateRegexp = dateRegex.exec(boxContent);
                if (dateRegexp !== undefined && dateRegexp !== null) {
                    let dateFF = dateRegexp[0];
                    currentDate = moment(dateFF, 'DD.MM.YYYY').startOf('day').toISOString(true);
                }
            } else if (currentDate !== undefined) {
                if (boxContent.match(groupRegex)) {
                    let currentType: string | undefined = undefined;
                    let tempContent = '';
                    boxContent.split('\n').forEach(line => {
                        line = line.trim();
                        if (line.endsWith(':')) {
                            if (tempContent.length > 0 && currentType !== undefined) {
                                tempMenus.push(new Menu(currentType, [new Meal(HashUtils.sha1Digest(type+tempContent), tempContent)]));
                                tempContent = '';
                            }
                            let regExp = groupRegex.exec(line);
                            if (regExp !== null)
                                currentType = regExp[1];
                        } else if (currentType !== undefined) {
                            tempContent += line.trim()+" \n";
                        }
                    });
                    if (tempContent.length > 0 && currentType !== undefined) {
                        tempMenus.push(new Menu(currentType, [new Meal(HashUtils.sha1Digest(type+tempContent), tempContent)]));
                        tempContent = '';
                    }

                } else if (boxContent.trim().length > 0) {
                    currentBasicContent += boxContent.trim();
                }
            }
        } else if (boxContent.trim().match(dietsRegex)) {
            let splittedBox = boxContent.trim().split(dietsRegex);
            let tmpDesc = '';
            splittedBox.forEach(item => {
                if (item.length > 0 && !item.includes('\n')) {
                    if (tmpDesc.length > 0) {
                        diets.push(new Diet(item.trim(), tmpDesc));
                        tmpDesc = '';
                        return;
                    }
                    tmpDesc = item.trim();
                }
            })
        }
    });
    if (currentBasicContent.length > 0) {
        items.push(new Day(currentDate, [{name: 'Lounas', meals: [new Meal(HashUtils.sha1Digest(type+currentBasicContent), currentBasicContent)]}]));
        currentBasicContent = '';
    } else if (tempMenus.length > 0) {
        items.push(new Day(currentDate, tempMenus));
        tempMenus = [];
    }
    return {menu: items, diets};
}