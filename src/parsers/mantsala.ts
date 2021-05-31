/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Day} from "../models/Day";
import {Diet} from "../models/Diet";
import * as parser from './iss-web';

const type = "mäntsälä";

export function parse(html: string): {menu: Day[], diets: Diet[]}|undefined {
    return parser.parse(html, type);
}