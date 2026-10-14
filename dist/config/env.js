"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// A clone of the project does not contain .env because it must never be
// committed. For local classes, use the versioned example as a safe fallback
// so that `npm run dev` works immediately. A real .env (or platform variables)
// always takes precedence, and production never uses the example file.
const localEnvironment = dotenv_1.default.config({ path: '.env' });
if (localEnvironment.error && process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config({ path: '.env.example' });
}
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
exports.env = {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    mongoUri: required('MONGO_URI'),
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d'
};
