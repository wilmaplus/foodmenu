/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Meal} from "./Meal";

export class Menu {
    name: string;
    meals: Meal[]

    constructor(name: string, meals: Meal[]) {
        this.name = name;
        this.meals = meals;
    }
}
