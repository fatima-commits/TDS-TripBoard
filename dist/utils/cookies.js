"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
const env_js_1 = require("../config/env.js");
const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env_js_1.env.nodeEnv === 'production',
    path: '/'
};
function setAuthCookies(response, accessToken, refreshToken) {
    response.cookie('accessToken', accessToken, cookieOptions);
    response.cookie('refreshToken', refreshToken, cookieOptions);
}
function clearAuthCookies(response) {
    response.clearCookie('accessToken', cookieOptions);
    response.clearCookie('refreshToken', cookieOptions);
}
