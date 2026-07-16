// search.js
const { db } = require("./db");

/**
 * Détecte automatiquement si le texte libre contient une année (ex: "1998"),
 * une plage ("avant 1980", "après 2001", "entre 1990 et 2000") et retourne
 * le texte nettoyé + les bornes d'années détectées.
 */
function extractYearFromQuery(query) {
  let cleaned = query || "";

  const between = cleaned.match(/entre\s+(\d{4})\s+et\s+(\d{4})/i);
  if (between) {
    cleaned = cleaned.replace(between[0], "").trim();
    return { cleanedQuery: cleaned, annee_min: parseInt(between[1]), annee_max: parseInt(between[2]) };
  }

  const before = cleaned.match(/avant\s+(\d{4})/i);
  if (before) {
    cleaned = cleaned.replace(before[0], "").trim();
    return { cleanedQuery: cleaned, annee_max: parseInt(before[1]) - 1 };
  }

  const after = cleaned.match(/apr[eè]s\s+(\d{4})/i);
  if (after) {
    cleaned = cleaned.replace(after[0], "").trim();
    return { cleanedQuery: cleaned, annee_min: parseInt(after[1]) + 1 };
  }

  const yearMatch = cleaned.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const currentYear = new Date().getFullYear();
    if (year >= 1900 && year <= currentYear + 1) {
      cleaned = cleaned.replace(yearMatch[0], "").trim();
      return { cleanedQuery: cleaned, annee: year };
    }
  }

  return { cleanedQuery: cleaned };
}

/** Échappe un terme pour l'utiliser dans une requête FTS5 (recherche par préfixe) */
function ftsTerm(word) {
  const safe = word.replace(/"/g, '""');
  return `"${safe}"*`;
}

/**
 * Recherche principale : combine le texte libre + les champs spécifiques
 * (prénom, nom, ville...) via FTS5, et applique les filtres exacts
 * (année, sexe, code postal...) en SQL classique.
 */
function searchPeople(filters) {
  const page = Math.max(1, parseInt(filters.page || "1", 10));
  const limit = Math.max(1, parseInt(filters.limit || "20", 10));
  const offset = (page - 1) * limit;

  const { cleanedQuery, annee: autoAnnee, annee_min: autoMin, annee_max: autoMax } =
    extractYearFromQuery(filters.q || "");

  // Rassemble tous les mots-clés texte (recherche libre + champs spécifiques)
  const textParts = [
    cleanedQuery,
    filters.prenom, filters.nom, filters.nom_naissance, filters.nom_affiche,
    filters.ville_naissance, filters.profession, filters.entreprise, filters.fonction,
    filters.email, filters.telephone, filters.pseudo,
  ].filter(Boolean).join(" ");

  const words = textParts.split(/\s+/).filter(Boolean);
  const ftsQuery = words.map(ftsTerm).join(" ");

  // Filtres exacts / plages
  const where = [];
  const params = {};

  const annee = filters.annee_naissance || autoAnnee;
  const anneeMin = filters.annee_min || autoMin;
  const anneeMax = filters.annee_max || autoMax;

  if (annee) { where.push("p.annee_naissance = @annee"); params.annee = parseInt(annee); }
  if (anneeMin) { where.push("p.annee_naissance >= @anneeMin"); params.anneeMin = parseInt(anneeMin); }
  if (anneeMax) { where.push("p.annee_naissance <= @anneeMax"); params.anneeMax = parseInt(anneeMax); }
  if (filters.sexe) { where.push("p.sexe = @sexe"); params.sexe = filters.sexe; }
  if (filters.ville) { where.push("p.ville LIKE @ville"); params.ville = `%${filters.ville}%`; }
  if (filters.code_postal) { where.push("p.code_postal LIKE @cp"); params.cp = `${filters.code_postal}%`; }
  if (filters.departement) { where.push("p.departement LIKE @dep"); params.dep = `%${filters.departement}%`; }
  if (filters.region) { where.push("p.region LIKE @region"); params.region = `%${filters.region}%`; }
  if (filters.pays) { where.push("p.pays LIKE @pays"); params.pays = `%${filters.pays}%`; }
  if (filters.nationalite) { where.push("p.nationalite LIKE @nat"); params.nat = `%${filters.nationalite}%`; }

  let baseQuery, countQuery;

  if (ftsQuery) {
    // Recherche texte via FTS5, jointe à la table people
    baseQuery = `
      SELECT p.* FROM people_fts f
      JOIN people p ON p.id = f.rowid
      WHERE f MATCH @ftsQuery ${where.length ? "AND " + where.join(" AND ") : ""}
      ORDER BY rank
      LIMIT @limit OFFSET @offset
    `;
    countQuery = `
      SELECT COUNT(*) as count FROM people_fts f
      JOIN people p ON p.id = f.rowid
      WHERE f MATCH @ftsQuery ${where.length ? "AND " + where.join(" AND ") : ""}
    `;
    params.ftsQuery = ftsQuery;
  } else {
    // Aucun texte : simple filtrage (ex. juste une année)
    baseQuery = `
      SELECT p.* FROM people p
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.nom
      LIMIT @limit OFFSET @offset
    `;
    countQuery = `
      SELECT COUNT(*) as count FROM people p
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
    `;
  }

  const results = db.prepare(baseQuery).all({ ...params, limit, offset });
  const total = db.prepare(countQuery).get(params).count;

  return { results, total, page, limit, detectedYear: annee, detectedYearMin: anneeMin, detectedYearMax: anneeMax };
}

module.exports = { searchPeople, extractYearFromQuery };
