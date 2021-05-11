/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Request, Response} from "express";
import {Http} from "../net/http";
import {errorResponse, responseStatus} from "../utils/response_utilities";
import {parse} from "../parsers/poytyaps";

const url = "https://www.poytya.fi/varhaiskasvatus-ja-koulutus/perusopetus/koulujen-yhteiset-tiedot/ruokalistat/";
let httpClient = new Http();


export function handlePoytya_PS(req: Request, res: Response) {
    httpClient.get(url, (error, response) => {
        if (error || response == undefined) {
            errorResponse(res, 500, error);
            return;
        }
        let parsedMenu = parse(response.body);
        if (parsedMenu !== undefined) {
            responseStatus(res, 200, true, parsedMenu);
        } else {
            errorResponse(res, 500, "Unable to parse menu!");
        }
    })
}