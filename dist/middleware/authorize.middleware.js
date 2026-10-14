"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
const app_error_js_1 = require("../utils/app-error.js");
function authorize(...allowedRoles) {
    return (request, response, next) => {
        const auth = request.auth;
        if (!auth || !allowedRoles.includes(auth.role)) {
            throw new app_error_js_1.AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource');
        }
        next();
    };
}
