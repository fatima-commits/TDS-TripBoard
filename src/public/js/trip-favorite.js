(() => {
  const OBJECT_ID = /^[a-f0-9]{24}$/i;
  let tripId = null;
  let isFavorite = false;
  let button = null;

  // 1) Intenta leer el id de la URL: ?id=, ?trip=, ?tripId= o cualquier valor
  //    con forma de ObjectId (también en el #hash).
  function idFromUrl() {
    const params = new URLSearchParams(location.search + "&" + location.hash.replace(/^#/, ""));
    for (const key of ["id", "trip", "tripId"]) {
      const value = params.get(key);
      if (value && OBJECT_ID.test(value)) return value;
    }
    for (const value of params.values()) {
      if (OBJECT_ID.test(value)) return value;
    }
    const fromPath = location.pathname.split("/").find(part => OBJECT_ID.test(part));
    return fromPath || null;
  }

  // 2) Respaldo: cuando trip.js pida el viaje con api.getTrip(id), tomamos ese id.
  const originalGetTrip = api.getTrip;
  api.getTrip = async (id, ...rest) => {
    const trip = await originalGetTrip.call(api, id, ...rest);
    if (trip && !tripId) setTrip(String(trip._id || id));
    return trip;
  };

  function paint() {
    if (!button) return;
    button.setAttribute("aria-pressed", String(isFavorite));
    button.textContent = isFavorite ? "♥ En favoritos" : "♡ Agregar a favoritos";
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  async function setTrip(id) {
    tripId = id;
    if (!button) return;

    try {
      const trips = await api.listFavoriteTrips();
      isFavorite = trips.some(trip => String(trip._id) === tripId);
    } catch (error) {
      // Si la lista falla, igual mostramos el botón (sin marcar).
      console.error("[favoritos] No se pudo consultar /favorites:", error);
    }
    paint();
    button.hidden = false;
  }

  async function toggle() {
    if (!tripId) return;
    button.disabled = true;
    try {
      if (isFavorite) {
        await api.removeFavoriteTrip(tripId);
        isFavorite = false;
        showToast("Viaje quitado de favoritos");
      } else {
        await api.addFavoriteTrip(tripId);
        isFavorite = true;
        showToast("Viaje agregado a favoritos");
      }
    } catch (error) {
      if (error.status === 409) isFavorite = true;      // ya estaba
      else if (error.status === 404 && isFavorite) isFavorite = false; // ya no estaba
      else showToast(error.message || "No se pudo actualizar");
    } finally {
      paint();
      button.disabled = false;
    }
  }

  function init() {
    button = document.querySelector("#btn-favorite-trip");
    if (!button) return;
    button.addEventListener("click", toggle);
    const id = tripId || idFromUrl();
    if (id) setTrip(id);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();