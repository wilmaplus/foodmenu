/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Request, Response} from "express";
import {Http} from "../net/http";
import {errorResponse, responseStatus} from "../utils/response_utilities";
import {parsePDFLink, parse} from "../parsers/loviisa_pk";


const url = "https://www.loviisa.fi/paivahoito-ja-koulutus/kouluruokailu/";
let httpClient = new Http();



export function handleLoviisaPk(req: Request, res: Response) {
    httpClient.get(url, (error, response) => {
        if (error || response == undefined) {
            errorResponse(res, 500, error);
            return;
        }
        let parsedPDFLink = parsePDFLink(response.body);
        if (parsedPDFLink !== undefined) {
           httpClient.get(parsedPDFLink, (error1, response1) => {
               if (error1 || response1 == undefined) {
                   errorResponse(res, 500, error);
                   return;
               }
               parse(response1.body, items => {
                   if (items == undefined) {
                       errorResponse(res, 500, "Unable to parse menu!");
                       return;
                   }
                   responseStatus(res, 200, true, {menu: items, diets: []});
               })
           })
        } else {
            errorResponse(res, 500, "Unable to parse menu link!");
        }
    })
}