// Se ejecuta antes de importar la app, porque config/env.ts exige estas variables.
// Si ya vienen definidas (GitHub Actions o tu terminal), se respetan.
process.env.NODE_ENV = 'test';

// Base de datos SOLO para pruebas: los tests borran sus colecciones.
// Por defecto usa el MongoDB de docker-compose, en una base aparte de la de desarrollo.
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/tripboard_test';

// Valores falsos, no son secretos: solo sirven para firmar tokens durante las pruebas.
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-not-real';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-not-real';
