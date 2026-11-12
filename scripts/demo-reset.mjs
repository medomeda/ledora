// Supprime la base de démonstration simulée : elle sera régénérée au prochain démarrage.
import { rmSync } from "node:fs";
rmSync(new URL("../.data", import.meta.url), { recursive: true, force: true });
console.log("Base de démonstration supprimée. Elle sera recréée au prochain démarrage.");
