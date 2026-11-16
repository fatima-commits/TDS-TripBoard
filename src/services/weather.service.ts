import { isValidObjectId } from 'mongoose';
import { Trip } from '../models/trip.model.js';
import { AppError } from '../utils/app-error.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const PLACEHOLDER_CITY = 'destino por definir';

// Códigos WMO que usa Open-Meteo -> descripción en español.
const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nevada ligera',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granizo fino',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  85: 'Chubascos de nieve ligeros',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta',
  96: 'Tormenta con granizo ligero',
  99: 'Tormenta con granizo intenso'
};

export type WeatherDay = { date: string; code: number; description: string; max: number; min: number };
export type Weather = {
  location: { name: string; country: string; latitude: number; longitude: number };
  current: { temperature: number; code: number; description: string; time: string };
  daily: WeatherDay[];
  units: { temperature: '°C' };
  fetchedAt: string;
};

type GeocodingResult = {
  name: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
};

type ForecastResponse = {
  current: { time: string; temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

// Caché en memoria por ubicación (clave normalizada).
const cache = new Map<string, { weather: Weather; expiresAt: number }>();

const describe = (code: number) => WEATHER_CODES[code] ?? 'Condición desconocida';

// Minúsculas y sin acentos, para comparar "Mexico" con "México".
function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function unavailable(): AppError {
  return new AppError(503, 'WEATHER_UNAVAILABLE', 'Weather service is unavailable, try again later');
}

async function fetchJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    // Timeout (AbortError/TimeoutError) o fallo de red.
    throw unavailable();
  }
  if (!response.ok) throw unavailable();
  try {
    return (await response.json()) as T;
  } catch {
    throw unavailable();
  }
}

// Ubicación a partir del viaje: ciudad + país, o solo el país si no hay ciudad real.
export function buildLocation(city: string | undefined, country: string | undefined) {
  const cleanCity = (city ?? '').trim();
  const cleanCountry = (country ?? '').trim();
  const hasCity = cleanCity !== '' && normalizeText(cleanCity) !== PLACEHOLDER_CITY;

  if (hasCity) return { query: cleanCity, country: cleanCountry };
  if (cleanCountry) return { query: cleanCountry, country: '' };
  return null;
}

async function geocode(query: string, country: string): Promise<GeocodingResult> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set('name', query);
  // Con país pedimos varios resultados para quedarnos con el de ese país
  // (el buscador solo filtra por nombre; "Mérida" existe en México y en España).
  url.searchParams.set('count', country ? '10' : '1');
  url.searchParams.set('language', 'es');
  url.searchParams.set('format', 'json');

  const { results } = await fetchJson<{ results?: GeocodingResult[] }>(url);
  if (!results?.length) {
    throw new AppError(404, 'LOCATION_NOT_FOUND', 'Trip destination was not found');
  }

  if (country) {
    const wanted = normalizeText(country);
    const match = results.find((result) =>
      normalizeText(result.country ?? '') === wanted || normalizeText(result.country_code ?? '') === wanted
    );
    if (match) return match;
  }
  return results[0];
}

async function fetchForecast(latitude: number, longitude: number): Promise<ForecastResponse> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const forecast = await fetchJson<ForecastResponse>(url);
  if (!forecast?.current || !Array.isArray(forecast.daily?.time)) throw unavailable();
  return forecast;
}

function normalizeWeather(place: GeocodingResult, forecast: ForecastResponse): Weather {
  const { current, daily } = forecast;
  return {
    location: {
      name: place.name,
      country: place.country ?? '',
      latitude: place.latitude,
      longitude: place.longitude
    },
    current: {
      temperature: Math.round(current.temperature_2m),
      code: current.weather_code,
      description: describe(current.weather_code),
      time: current.time
    },
    daily: daily.time.slice(0, 7).map((date, index) => ({
      date,
      code: daily.weather_code[index],
      description: describe(daily.weather_code[index]),
      max: Math.round(daily.temperature_2m_max[index]),
      min: Math.round(daily.temperature_2m_min[index])
    })),
    units: { temperature: '°C' },
    fetchedAt: new Date().toISOString()
  };
}

export async function getTripWeather(userId: string, tripId: unknown): Promise<Weather> {
  if (typeof tripId !== 'string' || !isValidObjectId(tripId)) {
    throw new AppError(400, 'INVALID_TRIP_ID', 'Trip id is invalid');
  }

  const trip = await Trip.findOne({ _id: tripId, user: userId, isActive: true });
  if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip was not found');

  const location = buildLocation(trip.city, trip.country);
  if (!location) {
    throw new AppError(400, 'LOCATION_REQUIRED', 'Add a destination to the trip to see its weather');
  }

  const cacheKey = `${normalizeText(location.query)}|${normalizeText(location.country)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.weather;

  const place = await geocode(location.query, location.country);
  const forecast = await fetchForecast(place.latitude, place.longitude);
  const weather = normalizeWeather(place, forecast);

  cache.set(cacheKey, { weather, expiresAt: Date.now() + CACHE_TTL_MS });
  return weather;
}

// Solo para pruebas.
export function clearWeatherCache(): void {
  cache.clear();
}
