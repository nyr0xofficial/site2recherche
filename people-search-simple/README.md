# Outil de recherche de personnes (version simple)

Version sans framework, sans Docker, sans TypeScript. Tout est en **JavaScript
simple**, et la base de données **SQLite** fait aussi office de moteur de
recherche (grâce à son extension intégrée FTS5) — donc **rien d'autre à
installer ou lancer en dehors de Node.js**.

## Ce qu'il faut installer (une seule fois)

**Node.js** (version LTS) : https://nodejs.org — installe-le comme n'importe
quel logiciel (double-clic sur l'installeur, "Suivant" partout).

Vérifie que ça a fonctionné en ouvrant un terminal et en tapant :
```bash
node -v
```
Ça doit afficher un numéro de version (ex. `v22.x.x`).

## Démarrage (à chaque fois)

Ouvre un terminal dans le dossier du projet, puis :

```bash
npm install
npm start
```

Ouvre ensuite ton navigateur à l'adresse : **http://localhost:3000**

C'est tout — un seul serveur, un seul onglet de terminal, aucune autre
commande à retenir.

## Comment ça marche

- `server.js` : le serveur. Il sert la page web (dossier `public/`) et
  répond aux requêtes de recherche/ajout/suppression.
- `db.js` : la base de données SQLite (fichier `data/database.db`, créé
  automatiquement au premier lancement) + l'index de recherche FTS5.
- `public/index.html`, `public/style.css`, `public/app.js` : le site,
  en HTML/CSS/JS classique — ouvre-les avec n'importe quel éditeur de texte,
  aucune compilation nécessaire.

## Utilisation

- Onglet **Recherche** : barre générale + sections repliables (Identité,
  Naissance, Contact, Adresse, Complémentaire). Tape juste une année
  (ex. `1998`) pour filtrer par date de naissance, ou `avant 1980` /
  `après 2001` / `entre 1990 et 2000`.
- Onglet **Administration** : importer un fichier CSV/Excel/JSON, ajouter
  une personne manuellement, reconstruire l'index, voir les statistiques.

## Import de données

Les colonnes de ton fichier sont reconnues automatiquement même en anglais
ou nommées différemment (`firstname`, `prénom`, `first_name` → tous mappés
vers `prenom`). Voir `fieldMapper.js` pour la liste complète.

## Arrêter le serveur

Dans le terminal où `npm start` tourne, `Ctrl + C`.
