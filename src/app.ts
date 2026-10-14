import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { authRouter } from './routes/auth.routes.js';
import { adminRouter, userRouter } from './routes/users.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { healthRouter } from './routes/health.routes.js';
import { tripRoutes } from './routes/trips.routes.js';
import { favoriteRouter } from './routes/favorites.routes.js';

const publicFolder = process.env.NODE_ENV === 'production' ? 'dist/public' : 'src/public';
const publicDirectory = path.join(process.cwd(), publicFolder);

export const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cookieParser());

app.use(healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/trips', tripRoutes);
app.use('/api/favorites', favoriteRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);

app.get('/', (_request, response) => response.sendFile(path.join(publicDirectory, 'trips.html')));
app.get('/login', (_request, response) => response.sendFile(path.join(publicDirectory, 'login.html')));
app.get('/register', (_request, response) => response.sendFile(path.join(publicDirectory, 'register.html')));
app.use(express.static(publicDirectory));

app.use(notFound);
app.use(errorHandler);
