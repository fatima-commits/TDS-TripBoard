"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const multer_1 = __importDefault(require("multer"));
const app_error_js_1 = require("../utils/app-error.js");
const notFound = (_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};
exports.notFound = notFound;
const errorHandler = (error, _request, response, _next) => {
    if (error instanceof app_error_js_1.AppError) {
        response.status(error.status).json({ error: { code: error.code, message: error.message } });
        return;
    }
    if (error instanceof multer_1.default.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'Evidence image must be 2 MB or smaller'
            : 'Could not upload evidence image';
        response.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
        return;
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        response.status(409).json({ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email already exists' } });
        return;
    }
    console.error(error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
exports.errorHandler = errorHandler;
