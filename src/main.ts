/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import express from 'express';
import bodyParser from "body-parser";

const PORT = process.env.PORT || 3001;
const asikkala = require('./handlers/asikkala').handleAsikkala;
const syk = require('./handlers/syk').handleSyk;
const steiner = require('./handlers/steiner').handleSteiner;
const pyhtaa = require('./handlers/pyhtaa').handlePyhtaa;
const kastelli = require('./handlers/kastelli').handleKastelli;
const loviisa = require('./handlers/loviisa_pk');


// Setting logs to include timestamp
require('console-stamp')(console, 'HH:MM:ss.l');

let app = express();
app.use(bodyParser.json());

app.use('/asikkala/menu', asikkala);
app.use('/syk/menu', syk);
app.use('/steiner/menu', steiner);
app.use('/pyhtaa/menu', pyhtaa);
app.use('/kastelli/menu', kastelli);
app.use('/loviisa/paivakoti/menu', loviisa.handleLoviisaPk);


app.listen(PORT, () => {
    console.log("Listening to port "+PORT);
});