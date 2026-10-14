# TDS-TripBoard

Proyecto del curso Tecnologías de desarrollo en el servidor. Completé el flujo para que un usuario autenticado cree viajes, organice su itinerario y guarde sus favoritos. Cada acción pasa por una API de Express protegida con JWT en cookie, MongoDB guarda la información y las páginas Mis viajes, Viaje y Favoritos la muestran.

**Autor:** Fátima Velez Gonzalez

## Cómo ejecutar el proyecto

```bash
npm install
docker compose up -d
npm run build
npm run dev
```

1. `npm install` instala las dependencias.
2. `docker compose up -d` levanta MongoDB.
3. `npm run build` compila el proyecto TypeScript.
4. `npm run dev` inicia el servidor en `http://localhost:3000`.
5. Crear una cuenta en `/register` o iniciar sesión en `/login`. Después, **Mis viajes** debe mostrar los viajes del usuario, o el aviso de que aún no tiene ninguno.

---

## El flujo que completé

### 1. Crear y consultar viajes

```
Mis viajes (el usuario crea un viaje)
  → trips.html + trips.js
  → api.js → POST /api/trips   (cookie accessToken, credentials: "include")
  → trips.routes.ts            (Route + authenticate)
  → authenticate.middleware.ts (verifica el JWT y llena request.auth)
  → trips.controller.ts        (Controller: createTrip con user = request.auth.userId)
  → Trip Model                 (Mongoose)
  → MongoDB
  → respuesta JSON { trip }
  → normalizeTrip() en api.js  (adapta days[].activities al formato del front)
  → trips.js / trip.js         (View)
```

Dentro de un viaje (`trip.html`), el mismo flujo cubre agregar actividades por día, moverlas de día, borrarlas y agregar destinos. Todo pasa por las rutas `/api/trips/:id/...` y siempre se filtra por el dueño del viaje.

### 2. Favoritos

El sistema maneja dos tipos de favoritos:

```
Viaje favorito (botón "♡ Agregar a favoritos" en trip.html)
  → trip-favorite.js
  → POST / DELETE /api/favorites/:tripId
  → favorites.routes.ts        (Route + authenticate)
  → favorite.controller.ts     (Controller: valida que el viaje sea del usuario)
  → Favorite Model             (userId + tripId, índice único)
  → MongoDB

Destino o actividad favorita (♥ dentro de trip.html)
  → PATCH /api/trips/:id/destinations/:destinationId   { isFavorite }
  → PATCH /api/trips/:id/activities/:activityId        { isFavorite }
  → trips.controller.ts → Trip Model → MongoDB

Página Favoritos
  → favorites.html + favorites.js
  → GET /api/favorites        (viajes, con populate de tripId)
  → GET /api/trips            (destinos y actividades con isFavorite: true)
  → View: secciones Viajes, Destinos y Actividades
```

Trabajé capa por capa y comprobé cada una antes de pasar a la siguiente: primero la API (Network y respuestas JSON), después las Views y al final los estilos.

---