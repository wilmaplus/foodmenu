
// URL https://ravintolapalvelut.iss.fi/ravintolat?nayta=koulut-ja-paivahoito
import {ISSRestaurant} from "../models/iss/ISSRestaurant";
import {Http} from "../net/http";
import {parseList} from "../parsers/iss-web"
import {Request, Response} from "express";
import {errorResponse, responseStatus} from "../utils/response_utilities";

const listUrl = "https://ravintolapalvelut.iss.fi/ravintolat?nayta=koulut-ja-paivahoito";
let httpClient = new Http();

export function getISSMenus() {
    return new Promise<ISSRestaurant[]>((resolve, reject) => {
        httpClient.get(listUrl, (err, resp) => {
            if (err || resp == undefined) {
                reject(err);
                return;
            }
            let parsedList = parseList(resp.body);
            resolve(parsedList);
        })
    });
}

export function handleISSMenuList(req: Request, res: Response) {
    getISSMenus().then(result => {
        responseStatus(res, 200, true, {menus: result});
    }).catch(err => {
        errorResponse(res, 500, err.toString());
    })
}

export function handleISSMenu(req: Request, res: Response) {

}