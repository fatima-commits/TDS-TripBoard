"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDemo = exports.me = void 0;
const user_model_js_1 = require("../models/user.model.js");
const app_error_js_1 = require("../utils/app-error.js");
const me = async (request, response) => {
    const auth = request.auth;
    if (!auth)
        throw new app_error_js_1.AppError(401, 'UNAUTHORIZED', 'Authentication is required');
    const user = await user_model_js_1.User.findById(auth.userId).select('email role');
    if (!user)
        throw new app_error_js_1.AppError(401, 'UNAUTHORIZED', 'User no longer exists');
    response.json({ id: user.id, email: user.email, role: user.role });
};
exports.me = me;
const adminDemo = (_request, response) => {
    response.json({ message: 'Admin access granted' });
};
exports.adminDemo = adminDemo;
