"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.refreshTokenExpiresAt = refreshTokenExpiresAt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const env_js_1 = require("../config/env.js");
function durationInMilliseconds(value) {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match)
        throw new Error('Token TTL must use s, m, h, or d (for example 15m)');
    const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return Number(match[1]) * units[match[2]];
}
function createAccessToken(userId, role) {
    return jsonwebtoken_1.default.sign({ sub: userId, role }, env_js_1.env.accessSecret, { expiresIn: env_js_1.env.accessTokenTtl });
}
function createRefreshToken(userId, sessionId) {
    // jti makes each rotation a distinct signed token, even within the same second.
    return jsonwebtoken_1.default.sign({ sub: userId, sid: sessionId, jti: (0, node_crypto_1.randomUUID)() }, env_js_1.env.refreshSecret, { expiresIn: env_js_1.env.refreshTokenTtl });
}
function verify(token, secret) {
    const payload = jsonwebtoken_1.default.verify(token, secret);
    if (typeof payload === 'string')
        throw new Error('Invalid token payload');
    return payload;
}
function verifyAccessToken(token) {
    const payload = verify(token, env_js_1.env.accessSecret);
    if (typeof payload.sub !== 'string' || (payload.role !== 'USER' && payload.role !== 'ADMIN'))
        throw new Error('Invalid access token');
    return { sub: payload.sub, role: payload.role };
}
function verifyRefreshToken(token) {
    const payload = verify(token, env_js_1.env.refreshSecret);
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string')
        throw new Error('Invalid refresh token');
    return { sub: payload.sub, sid: payload.sid };
}
function refreshTokenExpiresAt() {
    return new Date(Date.now() + durationInMilliseconds(env_js_1.env.refreshTokenTtl));
}
