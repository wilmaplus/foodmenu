/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import {Day} from "../models/Day";
import {Diet} from "../models/Diet";
import moment from 'moment';
// @ts-ignore
import icsToJson from 'ics-to-json'
const IcalExpander = require('ical-expander');
import {HashUtils} from "../crypto/hash";
const type = "kauhajoki";

/**
 * Now, this is an interesting case. Food menu in a calendar ICS, with repetitive events.
 * @param content
 */
export function parse(content: string): {menu: Day[], diets: Diet[]}|undefined {
    let days: Day[] = [];
    let rangeStart = moment().subtract(1, 'week').startOf('week').startOf('day');
    let rangeEnd = moment().add(2, 'week').endOf('week').startOf('day');
    const icalExpander = new IcalExpander({ics: content});
    const events = icalExpander.between(rangeStart.toDate(),rangeEnd.toDate());
    const mappedEvents = events.events.map((e:any) => ({ startDate: e.startDate, endDate: e.endDate, summary: e.summary }));
    const mappedOccurrences = events.occurrences.map((o:any) => ({ startDate: o.startDate, endDate: o.endDate, summary: o.item.summary }));
    let allEvents = [].concat(mappedEvents, mappedOccurrences).sort(function(a:any,b:any){
        return (a.startDate.toJSDate() - b.startDate.toJSDate()) + (a.endDate.toJSDate() - b.endDate.toJSDate());
    });
    allEvents.map((event:any) => {
        days.push(new Day(moment(event.startDate.toJSDate()).startOf('day').toISOString(true), [{name: 'Lounas', meals: [{name: event.summary, id: HashUtils.sha1Digest(type+'_'+event.summary)}]}]))
    })
    return {menu: days, diets: []};
}