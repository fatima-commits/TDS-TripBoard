(() => {
  // Si trip.js lee el id de otra forma, cambia solo esta línea.
  const tripUrl = id => `trip.html?id=${encodeURIComponent(id)}`;

  const GRADIENTS = [
    "linear-gradient(135deg,#0c2233,#1f6f78)",
    "linear-gradient(135deg,#1f6f78,#2f9e8f)",
    "linear-gradient(135deg,#12304a,#c98b2b)",
    "linear-gradient(135deg,#1f6f78,#0c2233 85%)"
  ];

  const CATEGORY_COLORS = {
    Comida: "#e5604f",
    Cultura: "#7a5af0",
    Transporte: "#1f6f78",
    Hospedaje: "#2f9e8f",
    Aventura: "#e8a33d"
  };

  const $ = selector => document.querySelector(selector);
  const money = value => "$" + (Number(value) || 0).toLocaleString("en-US");
  const gradientFor = index => GRADIENTS[(Number(index) || 0) % GRADIENTS.length];

  const sections = {
    trips: { list: $("#favorite-trips-list"), empty: $("#favorite-trips-empty"), count: $("#favorite-trips-count") },
    destinations: { list: $("#favorite-destinations-list"), empty: $("#favorite-destinations-empty"), count: $("#favorite-destinations-count") },
    activities: { list: $("#favorite-activities-list"), empty: $("#favorite-activities-empty"), count: $("#favorite-activities-count") }
  };

  const state = { trips: [], destinations: [], activities: [] };

  // -------------------------------------------------------------------------
  // Utilidades
  // -------------------------------------------------------------------------
  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  // Crea un elemento: el("a", { className: "x", href: "#" }, [hijos o texto])
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "style") node.setAttribute("style", value);
      else if (key.startsWith("aria-") || key.startsWith("data-")) node.setAttribute(key, value);
      else node[key] = value;
    }
    node.append(...[].concat(children));
    return node;
  }

  // Botón ♥ ya activo; al tocarlo quita el favorito.
  function heartButton(label, onRemove) {
    const button = el("button", { type: "button", className: "ib", textContent: "♥", "aria-pressed": "true", "aria-label": label });
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await onRemove();
      } catch (error) {
        showToast(error.message || "No se pudo actualizar");
        button.disabled = false;
      }
    });
    return button;
  }

  // -------------------------------------------------------------------------
  // Tarjetas (mismas clases que trips.html / trip.html)
  // -------------------------------------------------------------------------
  function tripCard(trip) {
    const over = trip.spent > trip.budget;
    const percent = trip.budget > 0 ? Math.min(100, (trip.spent / trip.budget) * 100) : 0;

    return el("article", { className: "ticket fav-card" }, [
      el("div", { className: "tk-top", style: `background:${gradientFor(trip.gradient)}` }, [
        heartButton(`Quitar ${trip.name} de favoritos`, () => removeTrip(trip)),
        el("h3", {}, el("a", { className: "stretch", href: tripUrl(trip._id), textContent: trip.name })),
        el("span", { textContent: trip.destination || "Destino por definir" })
      ]),
      el("div", { className: "tk-mid" }, [
        el("div", { className: "row2" }, [
          el("span", { textContent: `${trip.days} ${trip.days === 1 ? "día" : "días"}` }),
          el("span", { textContent: `${trip.activityCount} ${trip.activityCount === 1 ? "actividad" : "actividades"}` })
        ]),
        el("div", { className: `meter${over ? " over" : ""}` }, el("i", { style: `width:${percent}%` })),
        el("div", { className: "row2" }, [
          el("span", { textContent: `Gastado ${money(trip.spent)}` }),
          el("span", { textContent: `de ${money(trip.budget)}` })
        ])
      ])
    ]);
  }

  function destinationCard(destination) {
    return el("article", { className: "dest fav-card" }, [
      el("div", { className: "im", style: `background:${gradientFor(destination.trip.gradient)}` }, [
        el("span", { textContent: destination.name }),
        heartButton(`Quitar ${destination.name} de favoritos`, () => removeDestination(destination))
      ]),
      el("div", {}, el("a", { className: "stretch", href: tripUrl(destination.trip._id), textContent: destination.trip.name }))
    ]);
  }

  function activityCard(activity) {
    const color = CATEGORY_COLORS[activity.category] || "var(--accent)";
    return el("article", { className: "act fav-card", style: `--c:${color}` }, [
      el("small", { textContent: `${activity.trip.name} · ${activity.category}${activity.time ? " · " + activity.time : ""}` }),
      el("b", {}, el("a", { className: "stretch", href: tripUrl(activity.trip._id), textContent: activity.title })),
      el("div", { className: "bt" }, [
        el("span", { textContent: money(activity.cost) }),
        heartButton(`Quitar ${activity.title} de favoritos`, () => removeActivity(activity))
      ])
    ]);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  function renderSection(section, items, createCard) {
    section.list.replaceChildren(...items.map(createCard));
    section.list.hidden = items.length === 0;
    section.empty.hidden = items.length > 0;
    section.count.textContent = items.length || "";
  }

  function render() {
    renderSection(sections.trips, state.trips, tripCard);
    renderSection(sections.destinations, state.destinations, destinationCard);
    renderSection(sections.activities, state.activities, activityCard);
  }

  // -------------------------------------------------------------------------
  // Acciones
  // -------------------------------------------------------------------------
  async function removeTrip(trip) {
    await api.removeFavoriteTrip(trip._id);
    state.trips = state.trips.filter(t => t._id !== trip._id);
    render();
    showToast("Viaje quitado de favoritos");
  }

  async function removeDestination(destination) {
    await api.setFavorite(destination.trip._id, "destination", destination._id, false);
    state.destinations = state.destinations.filter(d => d._id !== destination._id);
    render();
    showToast("Destino quitado de favoritos");
  }

  async function removeActivity(activity) {
    await api.setFavorite(activity.trip._id, "activity", activity._id, false);
    state.activities = state.activities.filter(a => a._id !== activity._id);
    render();
    showToast("Actividad quitada de favoritos");
  }

  async function load() {
    try {
      const [trips, { destinations, activities }] = await Promise.all([
        api.listFavoriteTrips(),
        api.listFavorites()
      ]);
      Object.assign(state, { trips, destinations, activities });
      render();
    } catch (error) {
      $("#favorites-subtitle").textContent = "No se pudieron cargar tus favoritos.";
      showToast(error.message || "Algo salió mal");
    }
  }

  // -------------------------------------------------------------------------
  // Header: usuario y cerrar sesión (en trips/trip lo hace su propio script)
  // -------------------------------------------------------------------------
  const userName = $("#user-name");
  const user = Session.user;
  if (userName && !userName.textContent && user) {
    userName.textContent = user.name || user.email || "";
  }

  $("#btn-logout")?.addEventListener("click", async () => {
    try { await api.logout(); } catch { /* aunque falle, cerramos en el cliente */ }
    Session.clear();
    location.href = "/login";
  });

  load();
})();