// importers.js
const fs = require("fs");
const { parse } = require("csv-parse/sync");
const XLSX = require("xlsx");
const { insertPerson } = require("./db");
const { mapRowToPerson } = require("./fieldMapper");

/** Importe un fichier CSV (séparateur , ou ; auto-détecté) */
function importCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const delimiter = content.split("\n")[0].includes(";") ? ";" : ",";
  const rows = parse(content, { columns: true, delimiter, trim: true, skip_empty_lines: true });
  let count = 0;
  for (const row of rows) {
    insertPerson(mapRowToPerson(row));
    count++;
  }
  return count;
}

/** Importe la première feuille d'un fichier Excel (.xlsx / .xls) */
function importExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  let count = 0;
  for (const row of rows) {
    insertPerson(mapRowToPerson(row));
    count++;
  }
  return count;
}

/** Importe un fichier JSON (tableau d'objets, ou { data: [...] }) */
function importJson(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const rows = Array.isArray(parsed) ? parsed : parsed.data || [];
  let count = 0;
  for (const row of rows) {
    insertPerson(mapRowToPerson(row));
    count++;
  }
  return count;
}

module.exports = { importCsv, importExcel, importJson };
