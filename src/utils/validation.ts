import { CATEGORIES, MAX_DAYS, MIN_DAYS } from '../models/trip.model.js';
import { AppError } from './app-error.js';

// Reglas de entrada de viajes y actividades.
// Se validan ANTES de tocar MongoDB: un dato inválido se rechaza con 400 y un
// código estable; nunca se recorta, se convierte a 0 ni llega como 500.

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isMissing = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

// Acepta números o texto numérico ("800"); cualquier otra cosa no es un número.
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

function requiredText(value: unknown, code: string, field: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(400, code, `${field} is required`);
  if (text.length > maxLength) throw new AppError(400, code, `${field} must be ${maxLength} characters or fewer`);
  return text;
}

// days: opcional (1 por defecto). Si se envía, debe ser un entero entre 1 y 14.
export function parseDays(value: unknown): number {
  if (isMissing(value)) return MIN_DAYS;
  const days = toNumber(value);
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    throw new AppError(400, 'INVALID_DAYS', `days must be an integer between ${MIN_DAYS} and ${MAX_DAYS}`);
  }
  return days;
}

// budget / cost: opcional (0 por defecto). Si se envía, debe ser un número >= 0.
export function parseAmount(value: unknown, code: string, field: string): number {
  if (isMissing(value)) return 0;
  const amount = toNumber(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(400, code, `${field} must be a number greater than or equal to 0`);
  }
  return amount;
}

export type TripInput = { name: string; city: string; country: string; days: number; budget: number };

export function parseTripInput(body: unknown): TripInput {
  const data = (body ?? {}) as Record<string, unknown>;
  const name = requiredText(data.name, 'INVALID_TRIP_NAME', 'Trip name', 120);

  if (!isMissing(data.destination) && typeof data.destination !== 'string') {
    throw new AppError(400, 'INVALID_DESTINATION', 'destination must be text like "City, Country"');
  }
  const [city, ...rest] = String(data.destination ?? '').split(',').map((part) => part.trim());

  return {
    name,
    city: city || 'Destino por definir',
    country: rest.join(', '),
    days: parseDays(data.days),
    budget: parseAmount(data.budget, 'INVALID_BUDGET', 'budget')
  };
}

export type ActivityInput = { title: string; time: string; category: string; cost: number };

export function parseActivityInput(body: unknown): ActivityInput {
  const data = (body ?? {}) as Record<string, unknown>;
  const title = requiredText(data.title, 'INVALID_ACTIVITY_TITLE', 'Activity title', 120);

  const category = typeof data.category === 'string' ? data.category : '';
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    throw new AppError(400, 'INVALID_CATEGORY', `category must be one of: ${CATEGORIES.join(', ')}`);
  }

  let time = '09:00';
  if (!isMissing(data.time)) {
    if (typeof data.time !== 'string' || !TIME_PATTERN.test(data.time)) {
      throw new AppError(400, 'INVALID_TIME', 'time must use the HH:MM format');
    }
    time = data.time;
  }

  return { title, time, category, cost: parseAmount(data.cost, 'INVALID_COST', 'cost') };
}
