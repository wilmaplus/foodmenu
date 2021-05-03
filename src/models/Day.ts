/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Menu} from "./Menu";
import {Moment} from "moment";

export class Day {
    date: any
    menus: Menu[]

    constructor(date: any, menus: Menu[]) {
        this.date = date;
        this.menus = menus;
    }
}