// db.js
// Toute la base de données ET le moteur de recherche tiennent dans SQLite.
// Pas de serveur externe : la recherche rapide/floue est fournie par
// l'extension FTS5, livrée nativement avec SQLite.

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "database.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// --- Table principale --------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT, nom TEXT, nom_naissance TEXT, nom_affiche TEXT, sexe TEXT,
  date_naissance TEXT, annee_naissance INTEGER, mois_naissance INTEGER, jour_naissance INTEGER,
  ville_naissance TEXT,
  ville TEXT, code_postal TEXT, departement TEXT, region TEXT, pays TEXT, nationalite TEXT,
  email TEXT, telephone TEXT, pseudo TEXT,
  profession TEXT, entreprise TEXT, fonction TEXT, notes TEXT,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_annee ON people(annee_naissance);
CREATE INDEX IF NOT EXISTS idx_people_nom ON people(nom);
CREATE INDEX IF NOT EXISTS idx_people_ville ON people(ville);

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT, format TEXT, rows_imported INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index de recherche plein texte (FTS5) : recherche rapide sur tous les champs texte.
-- "content='people'" veut dire que la table FTS ne stocke pas les données en double,
-- elle pointe simplement vers la table "people" (économie d'espace).
CREATE VIRTUAL TABLE IF NOT EXISTS people_fts USING fts5(
  prenom, nom, nom_naissance, nom_affiche, ville, ville_naissance,
  code_postal, departement, region, pays, nationalite,
  profession, entreprise, fonction, email, telephone, pseudo, notes,
  content='people', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);

-- Triggers : garde l'index FTS automatiquement synchronisé à chaque
-- ajout/modification/suppression, sans intervention manuelle.
CREATE TRIGGER IF NOT EXISTS people_ai AFTER INSERT ON people BEGIN
  INSERT INTO people_fts(rowid, prenom, nom, nom_naissance, nom_affiche, ville, ville_naissance,
    code_postal, departement, region, pays, nationalite, profession, entreprise, fonction,
    email, telephone, pseudo, notes)
  VALUES (new.id, new.prenom, new.nom, new.nom_naissance, new.nom_affiche, new.ville, new.ville_naissance,
    new.code_postal, new.departement, new.region, new.pays, new.nationalite, new.profession,
    new.entreprise, new.fonction, new.email, new.telephone, new.pseudo, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS people_ad AFTER DELETE ON people BEGIN
  INSERT INTO people_fts(people_fts, rowid, prenom, nom, nom_naissance, nom_affiche, ville, ville_naissance,
    code_postal, departement, region, pays, nationalite, profession, entreprise, fonction,
    email, telephone, pseudo, notes)
  VALUES ('delete', old.id, old.prenom, old.nom, old.nom_naissance, old.nom_affiche, old.ville, old.ville_naissance,
    old.code_postal, old.departement, old.region, old.pays, old.nationalite, old.profession,
    old.entreprise, old.fonction, old.email, old.telephone, old.pseudo, old.notes);
END;

CREATE TRIGGER IF NOT EXISTS people_au AFTER UPDATE ON people BEGIN
  INSERT INTO people_fts(people_fts, rowid, prenom, nom, nom_naissance, nom_affiche, ville, ville_naissance,
    code_postal, departement, region, pays, nationalite, profession, entreprise, fonction,
    email, telephone, pseudo, notes)
  VALUES ('delete', old.id, old.prenom, old.nom, old.nom_naissance, old.nom_affiche, old.ville, old.ville_naissance,
    old.code_postal, old.departement, old.region, old.pays, old.nationalite, old.profession,
    old.entreprise, old.fonction, old.email, old.telephone, old.pseudo, old.notes);
  INSERT INTO people_fts(rowid, prenom, nom, nom_naissance, nom_affiche, ville, ville_naissance,
    code_postal, departement, region, pays, nationalite, profession, entreprise, fonction,
    email, telephone, pseudo, notes)
  VALUES (new.id, new.prenom, new.nom, new.nom_naissance, new.nom_affiche, new.ville, new.ville_naissance,
    new.code_postal, new.departement, new.region, new.pays, new.nationalite, new.profession,
    new.entreprise, new.fonction, new.email, new.telephone, new.pseudo, new.notes);
END;
`);

const PEOPLE_COLUMNS = [
  "prenom", "nom", "nom_naissance", "nom_affiche", "sexe",
  "date_naissance", "annee_naissance", "mois_naissance", "jour_naissance",
  "ville_naissance", "ville", "code_postal", "departement", "region",
  "pays", "nationalite", "email", "telephone", "pseudo",
  "profession", "entreprise", "fonction", "notes", "source",
];

/** Déduit année/mois/jour à partir d'une date au format YYYY-MM-DD (ou partielle) */
function parseDateParts(dateStr) {
  if (!dateStr) return {};
  const match = String(dateStr).match(/(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return {};
  return {
    annee: match[1] ? parseInt(match[1], 10) : undefined,
    mois: match[2] ? parseInt(match[2], 10) : undefined,
    jour: match[3] ? parseInt(match[3], 10) : undefined,
  };
}

function insertPerson(person) {
  const { annee, mois, jour } = parseDateParts(person.date_naissance);
  const data = {
    ...person,
    annee_naissance: person.annee_naissance ?? annee,
    mois_naissance: person.mois_naissance ?? mois,
    jour_naissance: person.jour_naissance ?? jour,
  };
  const cols = PEOPLE_COLUMNS.filter((c) => data[c] !== undefined && data[c] !== "");
  const placeholders = cols.map((c) => `@${c}`).join(", ");
  const stmt = db.prepare(`INSERT INTO people (${cols.join(", ")}) VALUES (${placeholders})`);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

function updatePerson(id, person) {
  const { annee, mois, jour } = parseDateParts(person.date_naissance);
  const data = { ...person };
  if (person.date_naissance) {
    data.annee_naissance = data.annee_naissance ?? annee;
    data.mois_naissance = data.mois_naissance ?? mois;
    data.jour_naissance = data.jour_naissance ?? jour;
  }
  const cols = PEOPLE_COLUMNS.filter((c) => data[c] !== undefined);
  if (cols.length === 0) return;
  const setClause = cols.map((c) => `${c} = @${c}`).join(", ");
  db.prepare(`UPDATE people SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
}

function deletePerson(id) {
  db.prepare("DELETE FROM people WHERE id = ?").run(id);
}

function getPerson(id) {
  return db.prepare("SELECT * FROM people WHERE id = ?").get(id);
}

function getAllPeople() {
  return db.prepare("SELECT * FROM people").all();
}

function countPeople() {
  return db.prepare("SELECT COUNT(*) as count FROM people").get().count;
}

function logImport(filename, format, rowsImported) {
  db.prepare("INSERT INTO imports (filename, format, rows_imported) VALUES (?, ?, ?)").run(filename, format, rowsImported);
}

function getImportHistory() {
  return db.prepare("SELECT * FROM imports ORDER BY created_at DESC").all();
}

/** Reconstruit entièrement l'index FTS à partir de la table people (utile après un gros import en masse) */
function reindexAll() {
  db.exec(`INSERT INTO people_fts(people_fts) VALUES('rebuild');`);
  return countPeople();
}

module.exports = {
  db,
  insertPerson,
  updatePerson,
  deletePerson,
  getPerson,
  getAllPeople,
  countPeople,
  logImport,
  getImportHistory,
  reindexAll,
};
