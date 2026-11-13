import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/index.js";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { loadSession } from "./middleware/session.js";
import { contributionFormRouter } from "./modules/contributions/form/routes.js";
import { contributionsRouter } from "./modules/contributions/routes.js";
import { licensesRouter } from "./modules/licenses/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { orgsRouter } from "./modules/orgs/routes.js";
import { problemsRouter } from "./modules/problems/routes.js";
import { reposRouter } from "./modules/repos/routes.js";
import { searchRouter } from "./modules/search/routes.js";
import { solutionsRouter } from "./modules/solutions/routes.js";
import { usersRouter } from "./modules/users/routes.js";
import { purgePendingSignups } from "./modules/users/service.js";
import { storage } from "./storage/index.js";

const app = express();

// better-auth lit lui-même le corps : il passe avant express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

// Les envois de fichiers (PUT .../files/*) restent des flux bruts, jamais parsés ; la page
// importée d'un formulaire de contribution a son propre analyseur, plus généreux.
const json = express.json({ limit: "1mb" });
app.use("/api", (req, res, next) =>
  req.method === "PUT" &&
  (req.path.includes("/files/") || req.path.endsWith("/contribution/form/code"))
    ? next()
    : json(req, res, next),
);
app.use("/api", loadSession);
for (const router of [
  usersRouter,
  orgsRouter,
  reposRouter,
  problemsRouter,
  solutionsRouter,
  contributionsRouter,
  contributionFormRouter,
  licensesRouter,
  notificationsRouter,
  searchRouter,
]) {
  app.use("/api", router);
}
app.use("/api", notFoundHandler);
app.use(errorHandler);

await storage.init();
app.listen(env.PORT, () => console.log(`API sur http://localhost:${env.PORT}/api`));

// Inscriptions jamais confirmées : nettoyées au démarrage, puis toutes les heures.
const purge = () =>
  purgePendingSignups()
    .then((n) => n && console.log(`${n} inscription(s) non confirmée(s) supprimée(s).`))
    .catch((e: unknown) => console.error("Nettoyage des inscriptions :", e));
void purge();
setInterval(purge, 3600 * 1000).unref();
