// server.js
// Serveur unique : sert le frontend (dossier public/) ET l'API.
// Aucune étape de build : tout est du JavaScript directement exécutable.

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  insertPerson, updatePerson, deletePerson, getPerson,
  countPeople, logImport, getImportHistory, reindexAll,
} = require("./db");
const { importCsv, importExcel, importJson } = require("./importers");
const { searchPeople } = require("./search");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "data", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // sert index.html, style.css, app.js

// --- Recherche -----------------------------------------------------------

app.get("/api/search", (req, res) => {
  try {
    res.json(searchPeople(req.query));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- CRUD personnes --------------------------------------------------------

app.post("/api/people", (req, res) => {
  try {
    const id = insertPerson(req.body);
    res.status(201).json(getPerson(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/people/:id", (req, res) => {
  const person = getPerson(parseInt(req.params.id, 10));
  if (!person) return res.status(404).json({ error: "Personne introuvable" });
  res.json(person);
});

app.put("/api/people/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    updatePerson(id, req.body);
    res.json(getPerson(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/people/:id", (req, res) => {
  try {
    deletePerson(parseInt(req.params.id, 10));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Administration --------------------------------------------------------

app.post("/api/admin/import", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni" });
    const ext = path.extname(req.file.originalname).toLowerCase();

    let rowsImported = 0;
    if (ext === ".csv") rowsImported = importCsv(req.file.path);
    else if (ext === ".xlsx" || ext === ".xls") rowsImported = importExcel(req.file.path);
    else if (ext === ".json") rowsImported = importJson(req.file.path);
    else return res.status(400).json({ error: `Format non supporté : ${ext}` });

    logImport(req.file.originalname, ext, rowsImported);
    res.json({ success: true, rowsImported });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

app.post("/api/admin/reindex", (req, res) => {
  try {
    const count = reindexAll();
    res.json({ success: true, indexed: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/stats", (req, res) => {
  res.json({ totalPeople: countPeople(), imports: getImportHistory() });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
