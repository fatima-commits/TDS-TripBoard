// js/trip-weather.js — Bloque de clima del viaje.
// Se carga aparte de trip.js: si el clima falla o tarda, el resto del viaje sigue normal.
(() => {
  const box = document.querySelector("#trip-weather");
  const id = new URLSearchParams(location.search).get("id");
  if (!box || !id) return;

  const escape = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Icono por grupo de código WMO (la descripción en español ya viene del backend).
  function icon(code) {
    if (code === 0) return "☀️";
    if (code <= 2) return "🌤️";
    if (code === 3) return "☁️";
    if (code <= 48) return "🌫️";
    if (code <= 67 || (code >= 80 && code <= 82)) return "🌧️";
    if (code <= 77 || code === 85 || code === 86) return "❄️";
    return "⛈️";
  }

  // "2026-11-16" -> "lun 16". Se arma con fecha local para no correr un día por la zona horaria.
  function dayLabel(isoDate, index) {
    if (index === 0) return "Hoy";
    const [y, m, d] = isoDate.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
    return `${weekday} ${d}`;
  }

  function notice(message) {
    box.innerHTML = `<div class="weather-notice"><span aria-hidden="true">🌥️</span><p>${escape(message)}</p></div>`;
  }

  function messageFor(err) {
    if (err.code === "LOCATION_REQUIRED") return "Agrega un destino al viaje para ver su clima.";
    if (err.code === "LOCATION_NOT_FOUND") return "No encontramos el clima de este destino. Revisa que la ciudad esté bien escrita.";
    if (err.status === 503) return "El clima no está disponible en este momento. Intenta más tarde.";
    return "No pudimos cargar el clima.";
  }

  function render(w) {
    const place = [w.location.name, w.location.country].filter(Boolean).join(", ");
    box.innerHTML = `
      <div class="weather-now">
        <span class="weather-icon" aria-hidden="true">${icon(w.current.code)}</span>
        <div>
          <b class="weather-temp">${w.current.temperature}°C</b>
          <span>${escape(w.current.description)}</span>
        </div>
        <small class="weather-place">Clima actual en ${escape(place)}<br>Pronóstico del destino, no de las fechas del viaje</small>
      </div>
      <ol class="weather-days" aria-label="Pronóstico de 7 días">
        ${w.daily.map((d, i) => `<li title="${escape(d.description)}">
          <small>${escape(dayLabel(d.date, i))}</small>
          <span aria-hidden="true">${icon(d.code)}</span>
          <span class="sr-only">${escape(d.description)}</span>
          <b>${d.max}°</b><small>${d.min}°</small>
        </li>`).join("")}
      </ol>`;
  }

  box.innerHTML = `<p class="weather-loading">Cargando clima…</p>`;
  api.getTripWeather(id).then(render).catch(err => notice(messageFor(err)));
})();
