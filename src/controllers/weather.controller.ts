import type { RequestHandler } from 'express';
import { getTripWeather } from '../services/weather.service.js';
import { AppError } from '../utils/app-error.js';

export const getWeather: RequestHandler = async (request, response) => {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  const weather = await getTripWeather(request.auth.userId, request.params.id);
  response.json({ weather });
};
