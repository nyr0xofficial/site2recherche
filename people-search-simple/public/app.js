// app.js - vanilla JS, pas de build, pas de framework.

const LIMIT = 20;
let currentPage = 1;
let currentTotal = 0;
let editingId = null;

// --- Navigation entre onglets ------------------------------------------

document.querySelectorAll(".nav-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.add("hidden"));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
    if (btn.dataset.tab === "admin") loadStats();
  });
});

// --- Collecte des filtres depuis le formulaire --------------------------

function collectFilters() {
  const filters = { q: document.getElementById("q").value };
  document.querySelectorAll("[data-filter]").forEach((input) => {
    if (input.value.trim()) filters[input.dataset.filter] = input.value.trim();
  });
  return filters;
}

// --- Recherche -----------------------------------------------------------

async function runSearch(page = 1) {
  const filters = collectFilters();
  filters.page = page;
  filters.limit = LIMIT;

  const qs = new URLSearchParams(filters).toString();
  const res = await fetch(`/api/search?${qs}`);
  const data = await res.json();

  currentPage = data.page;
  currentTotal = data.total;
  renderResults(data.results);
  renderPagination();
}

function renderResults(results) {
  const tbody = document.getElementById("results-body");
  const emptyState = document.getElementById("empty-state");
  const table = document.getElementById("results-table");

  tbody.innerHTML = "";

  if (results.length === 0) {
    table.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  table.style.display = "table";
  emptyState.style.display = "none";

  for (const p of results) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.nom) || "—"}</td>
      <td>${escapeHtml(p.prenom) || "—"}</td>
      <td>${escapeHtml(p.date_naissance || p.annee_naissance) || "—"}${p.ville_naissance ? " · " + escapeHtml(p.ville_naissance) : ""}</td>
      <td>${escapeHtml(p.ville) || "—"}</td>
      <td>${escapeHtml(p.email) || "—"}</td>
      <td>${escapeHtml(p.telephone) || "—"}</td>
      <td>${escapeHtml(p.profession) || "—"}</td>
      <td>
        <a class="edit" data-id="${p.id}">Modifier</a>
        <a class="delete" data-id="${p.id}">Supprimer</a>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("a.edit").forEach((a) =>
    a.addEventListener("click", () => openEditModal(parseInt(a.dataset.id)))
  );
  tbody.querySelectorAll("a.delete").forEach((a) =>
    a.addEventListener("click", () => handleDelete(parseInt(a.dataset.id)))
  );
}

function renderPagination() {
  const el = document.getElementById("pagination");
  const totalPages = Math.max(1, Math.ceil(currentTotal / LIMIT));

  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <span>${currentTotal} résultat${currentTotal > 1 ? "s" : ""} · page ${currentPage} / ${totalPages}</span>
    <div class="pg-buttons">
      <button class="secondary" id="pg-prev" ${currentPage <= 1 ? "disabled" : ""}>Précédent</button>
      <button class="secondary" id="pg-next" ${currentPage >= totalPages ? "disabled" : ""}>Suivant</button>
    </div>
  `;
  document.getElementById("pg-prev").addEventListener("click", () => runSearch(currentPage - 1));
  document.getElementById("pg-next").addEventListener("click", () => runSearch(currentPage + 1));
}

document.getElementById("btn-search").addEventListener("click", () => runSearch(1));
document.getElementById("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch(1);
});
document.querySelectorAll("[data-filter]").forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch(1);
  });
});

// --- Suppression -----------------------------------------------------------

async function handleDelete(id) {
  if (!confirm("Supprimer cette personne ?")) return;
  await fetch(`/api/people/${id}`, { method: "DELETE" });
  runSearch(currentPage);
}

// --- Modale d'ajout / modification -----------------------------------------

const MODAL_FIELDS = [
  ["prenom", "Prénom"], ["nom", "Nom"], ["nom_naissance", "Nom de naissance"],
  ["nom_affiche", "Nom affiché"], ["sexe", "Sexe"],
  ["date_naissance", "Date de naissance (YYYY-MM-DD)"], ["ville_naissance", "Ville de naissance"],
  ["ville", "Ville"], ["code_postal", "Code postal"], ["departement", "Département"],
  ["region", "Région"], ["pays", "Pays"], ["nationalite", "Nationalité"],
  ["email", "Email"], ["telephone", "Téléphone"], ["pseudo", "Pseudo"],
  ["profession", "Profession"], ["entreprise", "Entreprise"], ["fonction", "Fonction"],
  ["notes", "Notes"],
];

function buildModalFields(data = {}) {
  const container = document.getElementById("modal-fields");
  container.innerHTML = "";
  for (const [key, label] of MODAL_FIELDS) {
    const wrapper = document.createElement("label");
    wrapper.innerHTML = `${label} <input data-field="${key}" type="text" value="${escapeHtml(data[key]) || ""}" />`;
    container.appendChild(wrapper);
  }
}

function openAddModal() {
  editingId = null;
  document.getElementById("modal-title").textContent = "Ajouter une personne";
  buildModalFields();
  document.getElementById("modal-overlay").classList.remove("hidden");
}

async function openEditModal(id) {
  const res = await fetch(`/api/people/${id}`);
  const person = await res.json();
  editingId = id;
  document.getElementById("modal-title").textContent = "Modifier la personne";
  buildModalFields(person);
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("btn-add").addEventListener("click", openAddModal);

document.getElementById("modal-save").addEventListener("click", async () => {
  const payload = {};
  document.querySelectorAll("#modal-fields [data-field]").forEach((input) => {
    if (input.value.trim()) payload[input.dataset.field] = input.value.trim();
  });

  if (editingId) {
    await fetch(`/api/people/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  closeModal();
  runSearch(currentPage);
  loadStats();
});

// --- Administration ----------------------------------------------------

async function loadStats() {
  const res = await fetch("/api/admin/stats");
  const data = await res.json();
  document.getElementById("stat-total").textContent = data.totalPeople;
  document.getElementById("stat-imports").textContent = data.imports.length;
}

document.getElementById("import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const status = document.getElementById("admin-status");
  status.textContent = "Import en cours...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/admin/import", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur inconnue");
    status.textContent = `${data.rowsImported} lignes importées avec succès.`;
    loadStats();
  } catch (err) {
    status.textContent = `Erreur : ${err.message}`;
  } finally {
    e.target.value = "";
  }
});

document.getElementById("btn-reindex").addEventListener("click", async () => {
  const status = document.getElementById("admin-status");
  status.textContent = "Reconstruction de l'index en cours...";
  const res = await fetch("/api/admin/reindex", { method: "POST" });
  const data = await res.json();
  status.textContent = `Index reconstruit : ${data.indexed} personnes indexées.`;
});

// --- Utilitaire --------------------------------------------------------

function escapeHtml(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Charge les stats au démarrage (utile si on arrive directement sur l'onglet admin)
loadStats();
