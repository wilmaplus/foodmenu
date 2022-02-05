/*
 * Copyright (c) 2022 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */


import {removeImages} from "ghostscript-node"
import {Buffer} from "buffer";

/**
 * Removes images from PDF document, to temporarily fix a PDF parsing bug
 * @returns {Promise<Buffer>}
 */
export async function removeImagesFromPDF(pdf: Buffer) {
    return await removeImages(pdf)
}
