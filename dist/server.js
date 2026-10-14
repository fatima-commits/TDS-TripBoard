"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_js_1 = require("./config/database.js");
const env_js_1 = require("./config/env.js");
async function start() {
    await (0, database_js_1.connectDatabase)();
    app_1.app.listen(env_js_1.env.port, () => console.log(`TripBoard listening on http://localhost:${env_js_1.env.port}`));
}
start().catch((error) => {
    console.error('Could not start TripBoard:', error);
    process.exit(1);
});
