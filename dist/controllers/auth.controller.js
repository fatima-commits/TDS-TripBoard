"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAll = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const mongoose_1 = require("mongoose");
const session_model_1 = require("../models/session.model");
const user_model_js_1 = require("../models/user.model.js");
const app_error_js_1 = require("../utils/app-error.js");
const cookies_js_1 = require("../utils/cookies.js");
const jwt_js_1 = require("../utils/jwt.js");
const password_js_1 = require("../utils/password.js");
const token_hash_js_1 = require("../utils/token-hash.js");
// Leer y validar las credenciales del usuario (email y password) desde el cuerpo de la solicitud.
// Si las credenciales no son válidas, se lanza un error de validación.
function readCredentials(body) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    // Comprueba si el texto de la variable email no cumple con el patrón de la expresión regular.
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        throw new app_error_js_1.AppError(400, "VALIDATION_ERROR", "Provide a valid email and a password of at least 8 characters");
    }
    return { email, password };
}
// Helper para devolver un objeto de usuario público que contiene solo los campos necesarios para la respuesta
// para no devolver todo el documento MongoDB y exponer información sensible como el hash de la contraseña.
function publicUser(user) {
    return { id: user._id.toString(), email: user.email, role: user.role };
}
// Se crea un session id y un refresh token para el usuario autenticado,
// Se guarda la sesión en la base de datos y se devuelve un objeto con el access token y el refresh token.
async function createSessionTokens(user, userAgent) {
    const sessionId = new mongoose_1.Types.ObjectId();
    const userId = user._id.toString();
    const refreshToken = (0, jwt_js_1.createRefreshToken)(userId, sessionId.toString());
    // La sesion se guarda en MongoDB para que podamos invalidar el refresh token si el usuario cierra sesión
    // o si el refresh token se ve comprometido.
    await session_model_1.Session.create({
        _id: sessionId,
        userId: user._id,
        refreshTokenHash: (0, token_hash_js_1.hashRefreshToken)(refreshToken),
        expiresAt: (0, jwt_js_1.refreshTokenExpiresAt)(),
        userAgent,
    });
    return { accessToken: (0, jwt_js_1.createAccessToken)(userId, user.role), refreshToken };
}
// Lee y valida si en MongoDB ya existe un usuario con el mismo email, si no existe,
// se crea un nuevo usuario con el email y la contraseña hasheada.
const register = async (request, response) => {
    const { email, password } = readCredentials(request.body);
    const existingUser = await user_model_js_1.User.exists({ email });
    if (existingUser)
        throw new app_error_js_1.AppError(409, "EMAIL_ALREADY_EXISTS", "Email already exists");
    // conveierte la password en un hash seguro antes de guardarla en la base de datos
    // MiPassword123 -> bcrypt -> $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
    const passwordHash = await (0, password_js_1.hashPassword)(password);
    // Crea un nuevo usuario en la base de datos con el email y el hash de la password
    const user = await user_model_js_1.User.create({ email, passwordHash, role: "USER" });
    // Crea un session id y un refresh token para el usuario autenticado
    const tokens = await createSessionTokens(user, request.get("user-agent"));
    // Envia el access token y el refresh token al cliente en cookies seguras
    (0, cookies_js_1.setAuthCookies)(response, tokens.accessToken, tokens.refreshToken);
    response.status(201).json({ user: publicUser(user) });
};
exports.register = register;
const login = async (request, response) => {
    const { email, password } = readCredentials(request.body);
    const user = await user_model_js_1.User.findOne({ email });
    if (!user || !(await (0, password_js_1.comparePassword)(password, user.passwordHash))) {
        throw new app_error_js_1.AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const tokens = await createSessionTokens(user, request.get("user-agent"));
    (0, cookies_js_1.setAuthCookies)(response, tokens.accessToken, tokens.refreshToken);
    response.json({ user: publicUser(user) });
};
exports.login = login;
/*
¿Existe la sesión?
¿Pertenece al usuario?
¿Sigue activa?
¿No expiró?
¿El refresh token coincide?
*/
const refresh = async (request, response) => {
    const refreshToken = request.cookies.refreshToken;
    if (typeof refreshToken !== "string") {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Refresh token is required");
    }
    let payload;
    try {
        payload = (0, jwt_js_1.verifyRefreshToken)(refreshToken);
    }
    catch {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
    }
    const session = await session_model_1.Session.findById(payload.sid);
    const isValidSession = session &&
        session.userId.toString() === payload.sub &&
        !session.revokedAt &&
        session.expiresAt > new Date() &&
        (0, token_hash_js_1.refreshTokenMatches)(refreshToken, session.refreshTokenHash);
    if (!isValidSession) {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
    }
    const user = await user_model_js_1.User.findById(payload.sub);
    if (!user) {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "User no longer exists");
    }
    const newRefreshToken = (0, jwt_js_1.createRefreshToken)(user.id, session.id);
    session.refreshTokenHash = (0, token_hash_js_1.hashRefreshToken)(newRefreshToken);
    session.expiresAt = (0, jwt_js_1.refreshTokenExpiresAt)();
    await session.save();
    (0, cookies_js_1.setAuthCookies)(response, (0, jwt_js_1.createAccessToken)(user.id, user.role), newRefreshToken);
    response.json({ user: publicUser(user) });
};
exports.refresh = refresh;
const logout = async (request, response) => {
    const refreshToken = request.cookies.refreshToken;
    if (typeof refreshToken !== "string") {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Refresh token is required");
    }
    let payload;
    try {
        payload = (0, jwt_js_1.verifyRefreshToken)(refreshToken);
    }
    catch {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
    }
    const session = await session_model_1.Session.findById(payload.sid);
    const isCurrentSession = session &&
        session.userId.toString() === payload.sub &&
        !session.revokedAt &&
        session.expiresAt > new Date() &&
        (0, token_hash_js_1.refreshTokenMatches)(refreshToken, session.refreshTokenHash);
    if (!isCurrentSession) {
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
    }
    session.revokedAt = new Date();
    await session.save();
    (0, cookies_js_1.clearAuthCookies)(response);
    response.status(204).send();
};
exports.logout = logout;
const logoutAll = async (request, response) => {
    const auth = request.auth;
    if (!auth)
        throw new app_error_js_1.AppError(401, "UNAUTHORIZED", "Authentication is required");
    await session_model_1.Session.updateMany({ userId: auth.userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    (0, cookies_js_1.clearAuthCookies)(response);
    response.status(204).send();
};
exports.logoutAll = logoutAll;
