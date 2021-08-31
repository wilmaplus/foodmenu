
/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

export class ISSRestaurant {
    url: string|undefined
    name: string

    constructor(url: string | undefined, name: string) {
        this.url = url;
        this.name = name;
    }

}