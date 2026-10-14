import type { Request, RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';
import { Trip } from '../models/trip.model.js';
import { AppError } from '../utils/app-error.js';

function currentUserId(request: Request): string {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  }
  return request.auth.userId;
}

function readParam(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readQueryValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const sortOptions: Record<string, string> = {
  name: 'name',
  country: 'country name',
  price: 'price name',
  recent: '-createdAt'
};

async function findOwnedTrip(request: Request) {
  if (!isValidObjectId(request.params.id)) {
    throw new AppError(400, 'INVALID_TRIP_ID', 'Trip id is invalid');
  }

  const trip = await Trip.findOne({
    _id: request.params.id,
    user: currentUserId(request),
    isActive: true
  });

  if (!trip) {
    throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip was not found');
  }

  return trip;
}

function findActivity(
  trip: Awaited<ReturnType<typeof findOwnedTrip>>,
  activityId: string
) {
  for (const [dayIndex, day] of trip.days.entries()) {
    const activity = day.activities.id(activityId);
    if (activity) return { day, dayIndex, activity };
  }

  throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity was not found');
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export const listTrips: RequestHandler = async (request, response) => {
  const search = readQueryValue(request.query.search);
  const category = readQueryValue(request.query.category);
  const country = readQueryValue(request.query.country);
  const requestedSort = readQueryValue(request.query.sort);

  // Only the current user's active trips.
  const filter: Record<string, unknown> = {
    isActive: true,
    user: currentUserId(request)
  };

  if (search) {
    const searchExpression = new RegExp(escapeRegularExpression(search), 'i');
    filter.$or = [
      { name: searchExpression },
      { country: searchExpression },
      { city: searchExpression },
      { categories: searchExpression }
    ];
  }

  if (category) {
    filter.categories = new RegExp(escapeRegularExpression(category), 'i');
  }

  if (country) {
    filter.country = new RegExp(`^${escapeRegularExpression(country)}$`, 'i');
  }

  const sort = sortOptions[requestedSort] ?? sortOptions.name;
  const trips = await Trip.find(filter).sort(sort);

  response.json({ trips });
};

export const getTrip: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);
  response.json({ trip });
};

// ---------------------------------------------------------------------------
// Viajes
// ---------------------------------------------------------------------------

export const createTrip: RequestHandler = async (request, response) => {
  const { name, destination, days, budget } = request.body ?? {};

  if (!String(name ?? '').trim()) {
    throw new AppError(400, 'INVALID_TRIP_NAME', 'Trip name is required');
  }

  const [city, ...rest] = String(destination ?? '')
    .split(',')
    .map((part) => part.trim());
  const dayCount = Math.max(1, Math.min(14, Number(days) || 1));

  const trip = await Trip.create({
    user: currentUserId(request),
    name,
    city: city || 'Destino por definir',
    country: rest.join(', '),
    budget: Number(budget) || 0,
    gradient: Math.floor(Math.random() * 4),
    days: Array.from({ length: dayCount }, () => ({ activities: [] }))
  });

  response.status(201).json({ trip });
};

export const deleteTrip: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);

  // Soft delete, same convention as the catalog.
  trip.isActive = false;
  await trip.save();

  response.status(204).end();
};

// ---------------------------------------------------------------------------
// Actividades
// ---------------------------------------------------------------------------

export const addActivity: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);
  const day = trip.days[Number(request.params.day)];

  if (!day) {
    throw new AppError(404, 'DAY_NOT_FOUND', 'Day was not found');
  }

  const { title, time, category, cost } = request.body ?? {};
  day.activities.push({ title, time, category, cost });
  await trip.save();

  response.status(201).json({ trip });
};

// Sirve para favorito (isFavorite) y para mover de día (day).
export const updateActivity: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);
  const activityId = readParam(request.params.activityId);
  const { day, dayIndex, activity } = findActivity(
    trip,
    activityId
  );
  const { isFavorite, day: targetIndex } = request.body ?? {};

  if (typeof isFavorite === 'boolean') {
    activity.isFavorite = isFavorite;
  }

  if (Number.isInteger(targetIndex) && targetIndex !== dayIndex) {
    const target = trip.days[targetIndex];

    if (!target) {
      throw new AppError(400, 'INVALID_DAY', 'Day is invalid');
    }

    const data = activity.toObject();
    day.activities.pull(activity._id);
    target.activities.push(data);
  }

  await trip.save();
  response.json({ trip });
};

export const deleteActivity: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);
  const activityId = readParam(request.params.activityId);
  const { day, activity } = findActivity(trip, activityId);

  day.activities.pull(activity._id);
  await trip.save();

  response.json({ trip });
};

// Destinos

export const updateDestination: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);
  const destinationId = readParam(request.params.destinationId);
  const destination = trip.destinations.id(destinationId);

  if (!destination) {
    throw new AppError(404, 'DESTINATION_NOT_FOUND', 'Destination was not found');
  }

  if (typeof request.body?.isFavorite !== 'boolean') {
    throw new AppError(400, 'INVALID_BODY', 'isFavorite must be a boolean');
  }

  destination.isFavorite = request.body.isFavorite;
  await trip.save();

  response.json({ trip });
};

export const addDestination: RequestHandler = async (request, response) => {
  const trip = await findOwnedTrip(request);
  const name = String(request.body?.name ?? '').trim();

  if (!name) {
    throw new AppError(400, 'INVALID_DESTINATION_NAME', 'Destination name is required');
  }

  trip.destinations.push({ name });
  await trip.save();

  response.status(201).json({ trip });
};