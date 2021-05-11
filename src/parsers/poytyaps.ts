/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import {Day} from "../models/Day";
import {HashUtils} from "../crypto/hash";
import {Diet} from "../models/Diet";
import * as he from 'he';
import {HTMLElement, TextNode} from "node-html-parser";

const dateRegex = /([0-9]+).([0-9]+)/;
const type = "poytyaps";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    let document = parser.parse(html);
    let contentBox = document.querySelector(".main");
    if (contentBox !== null) {
        let items: Day[] = [];
        let children = contentBox.querySelectorAll('tbody>tr');
        children.forEach(child => {
            let columns = child.querySelectorAll('td');
            if (columns.length > 2) {
                let date = columns[1].textContent;
                if (date.match(dateRegex)) {
                    let regexResult = dateRegex.exec(date);
                    if (regexResult !== null) {
                        let ISODate = moment(regexResult[0], "DD.MM.YYYY").startOf('day').toISOString(true);
                        let reconstructedContent = '';
                        columns[2].childNodes.forEach(textElem => {
                            if (textElem instanceof HTMLElement && textElem.tagName.toLowerCase() === 'br') {
                                reconstructedContent += '\n';

                            } else if (textElem instanceof TextNode)  {
                                reconstructedContent += textElem.textContent;
                            }
                        });
                        let content = he.decode(reconstructedContent);
                        if (content !== undefined && content.length > 0)
                            items.push(new Day(ISODate, [{name: 'Lounas', meals: [{name: content, id: HashUtils.sha1Digest(type+'_'+content)}]}]));
                    }
                }

            }
        });
        return {menu: items, diets: []};
    }
    return undefined;
}