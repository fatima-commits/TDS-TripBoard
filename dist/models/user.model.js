"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.roles = void 0;
const mongoose_1 = require("mongoose");
exports.roles = ['USER', 'ADMIN'];
const userSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: exports.roles, required: true, default: 'USER' }
}, { timestamps: true });
exports.User = (0, mongoose_1.model)('User', userSchema);
