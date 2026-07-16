// fieldMapper.js
// Fait correspondre les noms de colonnes variés (français/anglais, majuscules,
// espaces, underscores...) vers les champs internes de la table `people`.
// Permet d'importer des fichiers sans avoir à renommer les colonnes soi-même.

const FIELD_ALIASES = {
  prenom: "prenom", "prénom": "prenom", firstname: "prenom", first_name: "prenom",
  nom: "nom", lastname: "nom", last_name: "nom", surname: "nom",
  nom_naissance: "nom_naissance", "nom de naissance": "nom_naissance", maiden_name: "nom_naissance",
  nom_affiche: "nom_affiche", "nom affiché": "nom_affiche", display_name: "nom_affiche", displayname: "nom_affiche",
  sexe: "sexe", gender: "sexe", genre: "sexe",
  date_naissance: "date_naissance", "date de naissance": "date_naissance", birthdate: "date_naissance", birth_date: "date_naissance", dob: "date_naissance",
  annee_naissance: "annee_naissance", "année de naissance": "annee_naissance", birth_year: "annee_naissance",
  ville_naissance: "ville_naissance", "ville de naissance": "ville_naissance", birth_city: "ville_naissance",
  ville: "ville", city: "ville",
  code_postal: "code_postal", "code postal": "code_postal", zip: "code_postal", zipcode: "code_postal", postal_code: "code_postal",
  departement: "departement", "département": "departement", department: "departement",
  region: "region", "région": "region",
  pays: "pays", country: "pays",
  nationalite: "nationalite", "nationalité": "nationalite", nationality: "nationalite",
  email: "email", mail: "email", "e-mail": "email",
  telephone: "telephone", "téléphone": "telephone", phone: "telephone", tel: "telephone",
  pseudo: "pseudo", username: "pseudo", nickname: "pseudo",
  profession: "profession", job: "profession", occupation: "profession",
  entreprise: "entreprise", company: "entreprise",
  fonction: "fonction", role: "fonction", position: "fonction",
  notes: "notes", note: "notes",
};

function normalizeKey(key) {
  return key.trim().toLowerCase();
}

/** Convertit une ligne brute (objet clé/valeur issu du CSV/Excel/JSON) vers les champs internes */
function mapRowToPerson(row) {
  const person = {};
  for (const [rawKey, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === "") continue;
    const target = FIELD_ALIASES[normalizeKey(rawKey)];
    if (target) person[target] = String(value).trim();
  }
  if (person.annee_naissance) person.annee_naissance = parseInt(person.annee_naissance, 10);
  return person;
}

module.exports = { mapRowToPerson };
