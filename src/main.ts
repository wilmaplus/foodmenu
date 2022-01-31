/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import express from 'express';
import bodyParser from "body-parser";

const PORT = process.env.PORT || 3001;
const SELENIUM_ARGS = process.env.SELENIUM_ARGS || null;
const asikkala = require('./handlers/asikkala').handleAsikkala;
const syk = require('./handlers/syk').handleSyk;
const tyk = require('./handlers/tyk').handleTyk;
const phyk = require('./handlers/phyk').handlePhyk;
const mayk = require('./handlers/mayk').handleMayk;
const poytyaps = require('./handlers/poytyaps').handlePoytya_PS;
const kauhajoki = require('./handlers/kauhajoki').handleKauhajoki;
const steiner = require('./handlers/steiner').handleSteiner;
const krtpl = require('./handlers/krtpl').handleKrtpl;
const lookiKbp = require('./handlers/looki-html').handleLookiKbp;
const pyhtaa = require('./handlers/pyhtaa').handlePyhtaa;
const kastelli = require('./handlers/kastelli').handleKastelli;
const mantsala = require('./handlers/mantsala').handleMantsala;
const issMenuList = require('./handlers/iss').handleISSMenuList;
const issMenu = require('./handlers/iss').handleISSMenu;
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
app.use('/tyk/menu', tyk);
app.use('/phyk/menu', phyk);
app.use('/mayk/menu', mayk);
app.use('/poytyaps/menu', poytyaps);
app.use('/kauhajoki/menu', kauhajoki);
app.use('/looki/:endpoint/menu', lookiKbp);
app.use('/kastelli/menu', kastelli);
app.use('/ael/menu', ael);
app.use('/mantsala/menu', mantsala);
app.use('/iss/menus', issMenuList);
app.use('/iss/menu/:url', issMenu);
app.use('/aroma/:url/restaurants/:id', aromaV2.getRestaurantPage);
app.use('/aroma/:url/restaurants', aromaV2.getMenuOptions);
app.use('/loviisa/paivakoti/menu', loviisa.handleLoviisaPk);

app.get('*', (req, res) => {
    res.status(404).json({'status': false, 'cause': "not found"});
});

app.listen(PORT, () => {
    console.log("Listening to port "+PORT);
});