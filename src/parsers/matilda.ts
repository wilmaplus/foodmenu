import * as parser from "node-html-parser";
import {Day} from "../models/Day";
import moment from "moment";
import {Menu} from "../models/Menu";
import {Meal} from "../models/Meal";
import {HashUtils} from "../crypto/hash";

const type = "aromiv2";


export async function extractNextJSBuildId(html: string): Promise<string> {
    let document = parser.parse(html);
    let json = JSON.parse(document.querySelector("script#__NEXT_DATA__").innerText);
    return json.buildId;
}

export async function parseMatildaModel(json: any) {
    let days: Day[] = [];

    let daysMap: any = {};

    for (let item of json) {
        if (daysMap[item.date])
            daysMap[item.date] = [...daysMap[item.date], item]
        else
            daysMap[item.date] = [item]
    }

    for (let key of Object.keys(daysMap)) {
        let date = moment(key);
        let menus: Menu[] = [];
        for (let i of daysMap[key]) {
            let meal = new Meal(HashUtils.sha1Digest(type+i.name+"_"+i.courses.map((i: { name: any; }) => i.name).join("\n")), i.courses.map((i: { name: any; }) => i.name).join("\n"))
            let menu = new Menu(i.name ?? "Lounas", [meal]);
            menus.push(menu);
        }
        days.push(new Day(date.startOf('day').format(), menus))
    }
    return days;
}
