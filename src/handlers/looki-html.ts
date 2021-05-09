/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Request, Response} from "express";
import {Http} from "../net/http";
import {errorResponse, responseStatus} from "../utils/response_utilities";
import {parse, parseLinks} from "../parsers/looki";
import {AsyncIterator} from "../utils/iterator";
import {Day} from "../models/Day";
import {Diet} from "../models/Diet";

const url = "https://looki.fi/";
let httpClient = new Http();

function fetchAndParse(url: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        httpClient.get(url, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(parse(response?.body));
        })
    });
}

export function handleLookiKbp(req: Request, res: Response) {
    if (!req.params.endpoint) {
        errorResponse(res, 400, "Menu endpoint is missing!");
        return;
    }
    httpClient.get(url+req.params.endpoint, (error, response) => {
        if (error || response == undefined) {
            errorResponse(res, 500, error);
            return;
        }
        let menuLinks = parseLinks(response.body);
        let items: Day[] = [];
        let diets: Diet[] = [];
        if (menuLinks !== undefined && menuLinks.length > 0) {
            let linkIterator = new AsyncIterator((item, iterator)=>{
                fetchAndParse(item).then(result => {
                    result.menu.forEach((menuItem: Day) => {items.push(menuItem)});
                    result.diets.forEach((dietItem: Diet) => {if (!diets.some(r=> r.name===dietItem.name)){diets.push(dietItem)}});
                    iterator.nextItem();
                }).catch(error => {
                    errorResponse(res, 500, error);
                })
            }, menuLinks, ()=>{
                responseStatus(res, 200, true, {menus: items, diets})
            });
            linkIterator.start();
        } else {
            errorResponse(res, 500, "Unable to parse menu!");
        }
    })
}