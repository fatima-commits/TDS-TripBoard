"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDestination = exports.updateDestination = exports.deleteActivity = exports.updateActivity = exports.addActivity = exports.deleteTrip = exports.createTrip = exports.getTrip = exports.listTrips = void 0;
const mongoose_1 = require("mongoose");
const trip_model_js_1 = require("../models/trip.model.js");
const app_error_js_1 = require("../utils/app-error.js");
function readQueryValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function escapeRegularExpression(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function readParam(value) {
    return typeof value === 'string' ? value : '';
}
// Only these sorts are allowed. Anything else falls back to "name".
const sortOptions = {
    name: 'name',
    country: 'country name',
    price: 'price name',
    recent: '-createdAt'
};
async function findOwnedTrip(request) {
    if (!(0, mongoose_1.isValidObjectId)(request.params.id)) {
        throw new app_error_js_1.AppError(400, 'INVALID_TRIP_ID', 'Trip id is invalid');
    }
    const trip = await trip_model_js_1.Trip.findOne({
        _id: request.params.id,
        user: request.user.id,
        isActive: true
    });
    if (!trip) {
        throw new app_error_js_1.AppError(404, 'TRIP_NOT_FOUND', 'Trip was not found');
    }
    return trip;
}
function findActivity(trip, activityId) {
    for (const [dayIndex, day] of trip.days.entries()) {
        const activity = day.activities.id(activityId);
        if (activity)
            return { day, dayIndex, activity };
    }
    throw new app_error_js_1.AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity was not found');
}
const listTrips = async (request, response) => {
    const search = readQueryValue(request.query.search);
    const category = readQueryValue(request.query.category);
    const country = readQueryValue(request.query.country);
    const requestedSort = readQueryValue(request.query.sort);
    // Only the current user's active trips.
    const filter = {
        isActive: true,
        user: request.user.id
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
    const trips = await trip_model_js_1.Trip.find(filter).sort(sort);
    response.json({ trips });
};
exports.listTrips = listTrips;
const getTrip = async (request, response) => {
    const trip = await findOwnedTrip(request);
    response.json({ trip });
};
exports.getTrip = getTrip;
// ---------------------------------------------------------------------------
// Viajes
// ---------------------------------------------------------------------------
const createTrip = async (request, response) => {
    const { name, destination, days, budget } = request.body ?? {};
    if (!String(name ?? '').trim()) {
        throw new app_error_js_1.AppError(400, 'INVALID_TRIP_NAME', 'Trip name is required');
    }
    const [city, ...rest] = String(destination ?? '')
        .split(',')
        .map((part) => part.trim());
    const dayCount = Math.max(1, Math.min(14, Number(days) || 1));
    const trip = await trip_model_js_1.Trip.create({
        user: request.user.id,
        name,
        city: city || 'Destino por definir',
        country: rest.join(', '),
        budget: Number(budget) || 0,
        gradient: Math.floor(Math.random() * 4),
        days: Array.from({ length: dayCount }, () => ({ activities: [] }))
    });
    response.status(201).json({ trip });
};
exports.createTrip = createTrip;
const deleteTrip = async (request, response) => {
    const trip = await findOwnedTrip(request);
    // Soft delete, same convention as the catalog.
    trip.isActive = false;
    await trip.save();
    response.status(204).end();
};
exports.deleteTrip = deleteTrip;
// ---------------------------------------------------------------------------
// Actividades
// ---------------------------------------------------------------------------
const addActivity = async (request, response) => {
    const trip = await findOwnedTrip(request);
    const day = trip.days[Number(request.params.day)];
    if (!day) {
        throw new app_error_js_1.AppError(404, 'DAY_NOT_FOUND', 'Day was not found');
    }
    const { title, time, category, cost } = request.body ?? {};
    day.activities.push({ title, time, category, cost });
    await trip.save();
    response.status(201).json({ trip });
};
exports.addActivity = addActivity;
// Sirve para favorito (isFavorite) y para mover de día (day).
const updateActivity = async (request, response) => {
    const trip = await findOwnedTrip(request);
    const activityId = readParam(request.params.activityId);
    const { day, dayIndex, activity } = findActivity(trip, activityId);
    const { isFavorite, day: targetIndex } = request.body ?? {};
    if (typeof isFavorite === 'boolean') {
        activity.isFavorite = isFavorite;
    }
    if (Number.isInteger(targetIndex) && targetIndex !== dayIndex) {
        const target = trip.days[targetIndex];
        if (!target) {
            throw new app_error_js_1.AppError(400, 'INVALID_DAY', 'Day is invalid');
        }
        const data = activity.toObject();
        day.activities.pull(activity._id);
        target.activities.push(data);
    }
    await trip.save();
    response.json({ trip });
};
exports.updateActivity = updateActivity;
const deleteActivity = async (request, response) => {
    const trip = await findOwnedTrip(request);
    const activityId = readParam(request.params.activityId);
    const { day, activity } = findActivity(trip, activityId);
    day.activities.pull(activity._id);
    await trip.save();
    response.json({ trip });
};
exports.deleteActivity = deleteActivity;
// Destinos
const updateDestination = async (request, response) => {
    const trip = await findOwnedTrip(request);
    const destinationId = readParam(request.params.destinationId);
    const destination = trip.destinations.id(destinationId);
    if (!destination) {
        throw new app_error_js_1.AppError(404, 'DESTINATION_NOT_FOUND', 'Destination was not found');
    }
    if (typeof request.body?.isFavorite !== 'boolean') {
        throw new app_error_js_1.AppError(400, 'INVALID_BODY', 'isFavorite must be a boolean');
    }
    destination.isFavorite = request.body.isFavorite;
    await trip.save();
    response.json({ trip });
};
exports.updateDestination = updateDestination;
const addDestination = async (request, response) => {
    const trip = await findOwnedTrip(request);
    const name = String(request.body?.name ?? '').trim();
    if (!name) {
        throw new app_error_js_1.AppError(400, 'INVALID_DESTINATION_NAME', 'Destination name is required');
    }
    trip.destinations.push({ name });
    await trip.save();
    response.status(201).json({ trip });
};
exports.addDestination = addDestination;
