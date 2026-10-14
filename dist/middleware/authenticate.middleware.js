"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const app_error_js_1 = require("../utils/app-error.js");
const jwt_js_1 = require("../utils/jwt.js");
const authenticate = (request, response, next) => {
    const accessToken = request.cookies.accessToken;
    if (typeof accessToken !== 'string') {
        throw new app_error_js_1.AppError(401, 'UNAUTHORIZED', 'Authentication is required');
    }
    try {
        const payload = (0, jwt_js_1.verifyAccessToken)(accessToken);
        request.auth = { userId: payload.sub, role: payload.role };
        next();
    }
    catch {
        throw new app_error_js_1.AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
    }
};
exports.authenticate = authenticate;
