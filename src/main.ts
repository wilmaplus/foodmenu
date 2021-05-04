/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import express from 'express';
import bodyParser from "body-parser";

const PORT = process.env.PORT || 3001;
const SELENIUM_ARGS = process.env.SELENIUM_ARGS || null;
const asikkala = require('./handlers/asikkala').handleAsikkala;
const syk = require('./handlers/syk').handleSyk;
const steiner = require('./handlers/steiner').handleSteiner;
const krtpl = require('./handlers/krtpl').handleKrtpl;
const lookiKbp = require('./handlers/looki-kpb').handleLookiKbp;
const pyhtaa = require('./handlers/pyhtaa').handlePyhtaa;
const kastelli = require('./handlers/kastelli').handleKastelli;
const ael = require('./handlers/ael').handleAEL;
const aromaV2 = require('./handlers/aromav2');
const loviisa = require('./handlers/loviisa_pk');

(global as any).seleniumArgs = SELENIUM_ARGS;
// Setting logs to include timestamp
require('console-stamp')(console, 'HH:MM:ss.l');

let app = express();
app.use(bodyParser.json());

app.use('/asikkala/menu', asikkala);
app.use('/syk/menu', syk);
app.use('/steiner/menu', steiner);
app.use('/pyhtaa/menu', pyhtaa);
app.use('/krtpl/menu', krtpl);
app.use('/looki/kbp/menu', lookiKbp);
app.use('/kastelli/menu', kastelli);
app.use('/ael/menu', ael);
app.use('/aroma/:url/restaurants/:id', aromaV2.getRestaurantPage);
app.use('/aroma/:url/restaurants', aromaV2.getMenuOptions);
app.use('/loviisa/paivakoti/menu', loviisa.handleLoviisaPk);

app.get('*', (req, res) => {
    res.status(404).json({'status': false, 'cause': "not found"});
});

app.listen(PORT, () => {
    console.log("Listening to port "+PORT);
});