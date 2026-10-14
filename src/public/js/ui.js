const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = n => "$" + Number(n).toLocaleString("en-US");
const CAT_COLORS = { Comida: "#F0506E", Cultura: "#7A5AF0", Transporte: "#2F7DE1", Hospedaje: "#0F9D8A", Aventura: "#F59E0B" };
const GRADIENTS = ["linear-gradient(135deg,#F0506E,#FF9A5A)", "linear-gradient(135deg,#1F6FD1,#27C2B1)", "linear-gradient(135deg,#7A5AF0,#E86FA8)", "linear-gradient(135deg,#0F9D8A,#8BD36B)"];
const gradient = key => GRADIENTS[[...String(key)].reduce((s, c) => s + c.charCodeAt(0), 0) % 4];

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.k); toast.k = setTimeout(() => t.hidden = true, 2200);
}
// La sesión real vive en la cookie: si no hay sesión, el backend responde 401 y api.js redirige a /login.
function requireAuth() {}
async function initHeader() {
  const u = Session.user; $("#user-name").textContent = u ? u.email : "";
  $("#btn-logout").onclick = async () => { try { await api.logout(); } catch (e) {} Session.clear(); location.href = "/login"; };
  let here = location.pathname.split("/").pop(); if (here === "trip.html") here = "trips.html";
  document.querySelectorAll("header nav a").forEach(a => a.getAttribute("href") === here && a.setAttribute("aria-current", "page"));
  try { const f = await api.listFavorites(); $("#favorites-count").textContent = f.destinations.length + f.activities.length; } catch (e) {}
}
document.addEventListener("click", e => { if (e.target.closest("[data-close]")) e.target.closest("dialog").close(); });