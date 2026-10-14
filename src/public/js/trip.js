requireAuth(); initHeader();
const tripId = new URLSearchParams(location.search).get("id");
let trip, tab = "itinerary";
const TABS = ["itinerary", "destinations", "budget"];

async function loadTrip() {
  if (!tripId) { location.href = "trips.html"; return; }
  try { trip = await api.getTrip(tripId); } catch (err) { toast(err.message); return; }
  if (!trip) { location.href = "trips.html"; return; }
  render();
}
function render() {
  const spent = trip.activities.reduce((s, a) => s + a.cost, 0), left = trip.budget - spent;
  $("#trip-name").textContent = trip.name;
  $("#trip-meta").textContent = `${trip.destination} · ${trip.days} días`;
  $("#stat-budget").textContent = money(trip.budget);
  $("#stat-spent").textContent = money(spent);
  $("#stat-left").textContent = money(left);
  $("#stat-left").style.color = left < 0 ? "var(--pink)" : "";
  $("#stat-left-label").textContent = left < 0 ? "Te pasaste" : "Disponible";
  $("#stat-activities").textContent = trip.activities.length;
  TABS.forEach(k => { $("#tab-" + k).setAttribute("aria-pressed", tab === k); $("#panel-" + k).hidden = tab !== k; });

  $("#days-board").innerHTML = Array.from({ length: trip.days }, (_, i) => i + 1).map(day => {
    const list = trip.activities.filter(a => a.day === day).sort((a, b) => a.time.localeCompare(b.time));
    return `<section class="col" id="day-${day}"><h3>Día ${day} <small>${money(list.reduce((s, a) => s + a.cost, 0))}</small></h3>
      ${list.map(a => `<div class="act" id="activity-${a._id}" style="--c:${CAT_COLORS[a.category]}"><small>${a.time} · ${a.category}</small><b>${esc(a.title)}</b>
        <div class="bt"><span>${money(a.cost)}</span>
          <button class="ib" data-action="move" data-id="${a._id}" data-day="${day - 1}" aria-label="Día anterior" ${day === 1 ? "disabled" : ""}>‹</button>
          <button class="ib" data-action="move" data-id="${a._id}" data-day="${day + 1}" aria-label="Día siguiente" ${day === trip.days ? "disabled" : ""}>›</button>
          <button class="ib" data-action="fav-activity" data-id="${a._id}" aria-pressed="${a.favorite}" aria-label="Favorito">♥</button>
          <button class="ib" data-action="delete-activity" data-id="${a._id}" aria-label="Eliminar">×</button></div></div>`).join("")}
      <button class="addact" data-action="add-activity" data-day="${day}">+ Agregar actividad</button></section>`;
  }).join("");

  $("#destinations-empty").hidden = trip.destinations.length > 0;
  $("#destinations-list").innerHTML = trip.destinations.map(d => `<div class="dest" id="destination-${d._id}">
    <div class="im" style="background:${gradient(d._id)}">${esc(d.name)}<button class="ib" data-action="fav-destination" data-id="${d._id}" aria-pressed="${d.favorite}" aria-label="Favorito">♥</button></div>
    <div>${esc(trip.destination)}</div></div>`).join("");

  $("#budget-breakdown").innerHTML = "<h3>Gasto por categoría</h3>" + (Object.keys(CAT_COLORS).map(k => [k, trip.activities.filter(a => a.category === k).reduce((s, a) => s + a.cost, 0)]).filter(x => x[1]).map(([k, v]) =>
    `<div class="cat" id="budget-${k}"><span>${k}</span><div class="meter"><i style="width:${v / spent * 100}%;background:${CAT_COLORS[k]}"></i></div><span>${money(v)}</span></div>`).join("") || `<p class="empty">Agrega actividades con costo para ver tu gasto.</p>`);
}

TABS.forEach(k => $("#tab-" + k).onclick = () => { tab = k; render(); });

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-action]"); if (!b) return;
  const { action, id, day } = b.dataset;
  try {
    if (action === "add-activity") { $("#activity-day").value = day; $("#dialog-activity").showModal(); return; }
    if (action === "move") await api.moveActivity(tripId, id, +day);
    if (action === "delete-activity") await api.deleteActivity(tripId, id);
    if (action === "fav-activity") {
      const current = trip.activities.find(a => a._id === id);
      await api.setFavorite(tripId, "activity", id, !current.favorite);
    }
    if (action === "fav-destination") {
      const current = trip.destinations.find(d => d._id === id);
      await api.setFavorite(tripId, "destination", id, !current.favorite);
    }
    await loadTrip(); initHeader();
  } catch (err) { toast(err.message); }
});
$("#btn-delete-trip").onclick = async () => {
  if (!confirm("¿Eliminar este viaje y todas sus actividades?")) return;
  try { await api.deleteTrip(tripId); location.href = "trips.html"; } catch (err) { toast(err.message); }
};
$("#btn-add-destination").onclick = () => $("#dialog-destination").showModal();
$("#destination-form").onsubmit = async e => {
  e.preventDefault();
  try { await api.createDestination({ trip: tripId, name: $("#destination-name").value.trim() }); $("#dialog-destination").close(); e.target.reset(); toast("Destino guardado"); loadTrip(); }
  catch (err) { toast(err.message); }
};
$("#activity-form").onsubmit = async e => {
  e.preventDefault();
  try {
    await api.createActivity({ trip: tripId, day: +$("#activity-day").value, title: $("#activity-title").value.trim(),
      time: $("#activity-time").value || "09:00", cost: +$("#activity-cost").value || 0, category: $("#activity-category").value });
    $("#dialog-activity").close(); e.target.reset(); toast("Actividad guardada"); loadTrip();
  } catch (err) { toast(err.message); }
};
loadTrip();