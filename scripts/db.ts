/**
 * Outils de base de données (voir README) :
 *   npm run db:migrate   applique les migrations (aucune donnée de démonstration)
 *   npm run db:reset     remplace TOUT le contenu par le jeu de démonstration
 *   npm run db:empty     vide toutes les tables
 * Le pilote est choisi comme pour l'application (DATABASE_URL, sinon LEADORA_DB=pglite).
 */
import "@/server/bootstrap";
import { driverKind, getDriver, resetState } from "@/server/db/store";

// tsx ne lit pas les fichiers .env : on charge .env.local comme le fait Next.js.
try {
  process.loadEnvFile(".env.local");
} catch {
  // pas de .env.local : on utilise l'environnement tel quel
}

const cmd = process.argv[2];
if (driverKind() === "memory") {
  console.error("Aucune base configurée : définissez DATABASE_URL (PostgreSQL) ou LEADORA_DB=pglite. Voir .env.example.");
  process.exit(1);
}
if (cmd === "migrate") {
  process.env.LEADORA_SEED_DEMO = "0";
  await getDriver();
  console.log(`Migrations appliquées (${driverKind()}).`);
} else if (cmd === "reset") {
  process.env.LEADORA_SEED_DEMO = "0";
  await resetState(true);
  console.log(`Jeu de démonstration chargé (${driverKind()}).`);
} else if (cmd === "empty") {
  process.env.LEADORA_SEED_DEMO = "0";
  await resetState(false);
  console.log(`Base vidée (${driverKind()}).`);
} else {
  console.error("Commande inconnue. Utilisez : migrate | reset | empty");
  process.exit(1);
}
process.exit(0);
