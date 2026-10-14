// js/api.js — Conexión del front con el backend de TripBoard.
// Traduce entre el formato del backend (days[].activities, isFavorite, ...)
// y el que ya usan trip.js / trips.js / ui.js (activities planas, favorite, ...).

// Cambia esto si tu API vive en otro origen, p. ej. "http://localhost:3000/api"
const API_URL = "http://localhost:3000/api";

// Mientras depuras: no redirige al login en un 401 y muestra el estado HTTP en el aviso.
// Ponlo en false cuando todo funcione.
const DEBUG = true;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Sesión (ui.js usa Session.user). Si ya tienes la tuya, conserva esa.
// ---------------------------------------------------------------------------
const Session = {
  KEY: "tripboard:user",
  get user() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch { return null; }
  },
  set(user) { localStorage.setItem(this.KEY, JSON.stringify(user)); },
  clear() { localStorage.removeItem(this.KEY); }
};

// ---------------------------------------------------------------------------
// Petición base
// ---------------------------------------------------------------------------
async function request(path, { method = "GET", body, redirectOn401 = true } = {}) {
  const response = await fetch(API_URL + path, {
    method,
    credentials: "include", // envía la cookie de sesión
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 401 && redirectOn401 && !DEBUG) {
    Session.clear();
    location.href = "/login";
    throw new ApiError(401, "Tu sesión expiró");
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? data?.message ?? "Algo salió mal";
    console.error(`[API] ${method} ${path} → ${response.status}`, data);
    throw new ApiError(response.status, DEBUG ? `[${response.status}] ${message}` : message);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Adaptador: backend -> formato del front
// ---------------------------------------------------------------------------
function normalizeTrip(t) {
  const activities = t.days.flatMap((day, index) =>
    day.activities.map(a => ({
      _id: a._id,
      title: a.title,
      time: a.time,
      category: a.category,
      cost: a.cost,
      favorite: a.isFavorite,
      day: index + 1 // el front cuenta los días desde 1
    }))
  );

  return {
    _id: t._id,
    name: t.name,
    destination: t.destination,
    budget: t.budget,
    days: t.days.length,
    activities,
    destinations: t.destinations.map(d => ({ _id: d._id, name: d.name, favorite: d.isFavorite })),
    activityCount: activities.length,
    spent: activities.reduce((sum, a) => sum + a.cost, 0)
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
const api = {
  // --- Auth (RUTAS SUPUESTAS: ajústalas a las de tu backend) ---------------
  async login(email, password) {
    const { user } = await request("/auth/login", { method: "POST", body: { email, password }, redirectOn401: false });
    Session.set(user);
    return user;
  },
  async register(name, email, password) {
    const { user } = await request("/auth/register", { method: "POST", body: { name, email, password }, redirectOn401: false });
    Session.set(user);
    return user;
  },
  logout: () => request("/auth/logout", { method: "POST", redirectOn401: false }),

  // --- Viajes --------------------------------------------------------------
  async listTrips() {
    const { trips } = await request("/trips?sort=recent");
    return trips.map(normalizeTrip);
  },

  async getTrip(id) {
    try {
      const { trip } = await request(`/trips/${id}`);
      return normalizeTrip(trip);
    } catch (err) {
      if (err.status === 400 || err.status === 404) return null; // id inválido o inexistente
      throw err;
    }
  },

  async createTrip(data) {
    const { trip } = await request("/trips", { method: "POST", body: data });
    return normalizeTrip(trip);
  },

  deleteTrip: id => request(`/trips/${id}`, { method: "DELETE" }),

  // --- Actividades ---------------------------------------------------------
  // `day` llega desde el front en base 1; el backend usa índice desde 0.
  createActivity: ({ trip, day, ...activity }) =>
    request(`/trips/${trip}/days/${day - 1}/activities`, { method: "POST", body: activity }),

  moveActivity: (tripId, activityId, day) =>
    request(`/trips/${tripId}/activities/${activityId}`, { method: "PATCH", body: { day: day - 1 } }),

  deleteActivity: (tripId, activityId) =>
    request(`/trips/${tripId}/activities/${activityId}`, { method: "DELETE" }),

  // --- Destinos ------------------------------------------------------------
  createDestination: ({ trip, name }) =>
    request(`/trips/${trip}/destinations`, { method: "POST", body: { name } }),

  // --- Favoritos -----------------------------------------------------------
  // kind: "activity" | "destination"
  setFavorite: (tripId, kind, id, isFavorite) => {
    const path = kind === "activity"
      ? `/trips/${tripId}/activities/${id}`
      : `/trips/${tripId}/destinations/${id}`;
    return request(path, { method: "PATCH", body: { isFavorite } });
  },

  // Se calcula en el cliente a partir de la lista de viajes (no hay endpoint propio).
  async listFavorites() {
    const trips = await api.listTrips();
    const favorites = { destinations: [], activities: [] };
    for (const t of trips) {
      const trip = { _id: t._id, name: t.name, destination: t.destination };
      t.destinations.filter(d => d.favorite).forEach(d => favorites.destinations.push({ ...d, trip }));
      t.activities.filter(a => a.favorite).forEach(a => favorites.activities.push({ ...a, trip }));
    }
    return favorites;
  }
};