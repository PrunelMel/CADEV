// Applique les migrations Drizzle versionnées (dossier drizzle/) : utilisé en production, où
// drizzle-kit (outil de développement) n'est pas installé.
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";

const folder = fileURLToPath(new URL("../../drizzle", import.meta.url));
await migrate(db, { migrationsFolder: folder });
console.log("Migrations appliquées.");
process.exit(0);
