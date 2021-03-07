/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */
import {Response} from "express";

/**
 * Internal command for making JSON response
 * @param res Response object from express
 * @param statusCode HTTP Status code
 * @param status Boolean for success, true = request was successful
 * @param extra Extra data, if request needs to response any data, should be passed here
 * Author: @developerfromjokela
 * @returns {this}
 */
export function responseStatus(res: Response, statusCode=200, status=true, extra={}) {
    return res.status(statusCode).json(Object.assign({'status': status}, extra))
}

/**
 * Internal command for returning an error response in JSON format
 * @param res Response object from express
 * @param statusCode HTTP Status code
 * @param error Error
 */
export function errorResponse(res: Response, statusCode=200, error: any) {
    console.error(error);
    let extra: {[k: string]: any} = {cause: error.toString()};
    return res.status(statusCode).json(Object.assign({'status': false}, extra));
}