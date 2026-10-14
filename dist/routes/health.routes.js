"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_js_1 = require("../config/database.js");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
});
exports.healthRouter.get('/ready', (_request, response) => {
    if ((0, database_js_1.isDatabaseConnected)()) {
        response.json({ status: 'ready', database: 'connected' });
        return;
    }
    response.status(503).json({ status: 'not_ready', database: 'disconnected' });
});
