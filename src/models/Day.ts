/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Menu} from "./Menu";
import {Moment} from "moment";

export class Day {
    date: Moment
    menus: Menu[]

    constructor(date: Moment, menus: Menu[]) {
        this.date = date;
        this.menus = menus;
    }
}