import type { Request, RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';
import { Favorite } from '../models/favorite.model.js';
import { Trip } from '../models/trip.model.js';
import { AppError } from '../utils/app-error.js';

function getUserId(request: Request): string {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  return request.auth.userId;
}

function readTripId(value: unknown): string {
  if (typeof value !== 'string' || !isValidObjectId(value)) {
    throw new AppError(400, 'INVALID_TRIP_ID', 'Trip id is invalid');
  }
  return value;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export const listFavorites: RequestHandler = async (request, response) => {
  const userId = getUserId(request);

  const favorites = await Favorite.find({ userId })
    // Only the user's own trips that have not been deleted (soft delete).
    .populate({ path: 'tripId', match: { user: userId, isActive: true } })
    .sort('-createdAt');

  // populate leaves tripId as null when the trip no longer matches.
  response.json({ favorites: favorites.filter((favorite) => favorite.tripId) });
};

export const addFavorite: RequestHandler = async (request, response) => {
  const userId = getUserId(request);
  const tripId = readTripId(request.params.tripId);

  // The trip must belong to the current user.
  const trip = await Trip.findOne({ _id: tripId, user: userId, isActive: true });
  if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip was not found');

  try {
    const favorite = await Favorite.create({ userId, tripId });
    response.status(201).json({ favorite });
  } catch (error) {
    // The unique index { userId, tripId } also covers two requests arriving at once.
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'FAVORITE_ALREADY_EXISTS', 'Trip is already in favorites');
    }
    throw error;
  }
};

export const removeFavorite: RequestHandler = async (request, response) => {
  const favorite = await Favorite.findOneAndDelete({
    userId: getUserId(request),
    tripId: readTripId(request.params.tripId)
  });

  if (!favorite) throw new AppError(404, 'FAVORITE_NOT_FOUND', 'Trip is not in favorites');

  response.status(204).send();
};