"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashRefreshToken = hashRefreshToken;
exports.refreshTokenMatches = refreshTokenMatches;
const node_crypto_1 = require("node:crypto");
// bcrypt truncates input after 72 bytes. JWTs are longer, so use SHA-256 for
// refresh-token comparison and keep bcrypt exclusively for user passwords.
function hashRefreshToken(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
}
function refreshTokenMatches(token, storedHash) {
    const tokenHash = Buffer.from(hashRefreshToken(token), 'hex');
    const savedHash = Buffer.from(storedHash, 'hex');
    return tokenHash.length === savedHash.length && (0, node_crypto_1.timingSafeEqual)(tokenHash, savedHash);
}
