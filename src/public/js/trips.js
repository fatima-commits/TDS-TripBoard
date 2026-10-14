requireAuth(); initHeader();
async function loadTrips() {
  const trips = await api.listTrips();
  $("#trips-count").textContent = trips.length + " viajes planeados";
  $("#trips-empty").hidden = trips.length > 0;
  $("#trips-list").innerHTML = trips.map(t => {
    const pct = Math.min(100, t.budget ? t.spent / t.budget * 100 : 0);
    return `<a class="ticket" id="trip-card-${t._id}" data-id="${t._id}" href="trip.html?id=${t._id}">
      <div class="tk-top" style="background:${gradient(t._id)}"><h3>${esc(t.name)}</h3><span>${esc(t.destination)}</span></div>
      <div class="tk-mid"><div class="row2"><span>${t.days} días</span><span>${t.activityCount} actividades</span></div>
        <div class="meter ${t.spent > t.budget ? "over" : ""}"><i style="width:${pct}%"></i></div>
        <div class="row2"><span>Gastado ${money(t.spent)}</span><span>de ${money(t.budget)}</span></div></div></a>`;
  }).join("");
}
$("#btn-new-trip").onclick = () => $("#dialog-trip").showModal();
$("#trip-form").onsubmit = async e => {
  e.preventDefault();
  try {
    await api.createTrip({
      name: $("#trip-name").value.trim(),
      destination: $("#trip-destination").value.trim() || "Destino por definir",
      days: Math.max(1, Math.min(14, +$("#trip-days").value || 1)),
      budget: +$("#trip-budget").value || 0
    });
    $("#dialog-trip").close(); e.target.reset(); toast("Viaje creado"); loadTrips();
  } catch (err) { toast(err.message); }
};
loadTrips();
