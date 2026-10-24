import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/index.js";
import { env } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { loadSession } from "./middleware/session.js";
import { contributionsRouter } from "./modules/contributions/routes.js";
import { licensesRouter } from "./modules/licenses/routes.js";
import { orgsRouter } from "./modules/orgs/routes.js";
import { problemsRouter } from "./modules/problems/routes.js";
import { reposRouter } from "./modules/repos/routes.js";
import { searchRouter } from "./modules/search/routes.js";
import { solutionsRouter } from "./modules/solutions/routes.js";
import { usersRouter } from "./modules/users/routes.js";
import { storage } from "./storage/index.js";

const app = express();

// better-auth lit lui-même le corps : il passe avant express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

// Les envois de fichiers (PUT .../files/*) restent des flux bruts, jamais parsés.
const json = express.json({ limit: "1mb" });
app.use("/api", (req, res, next) =>
  req.method === "PUT" && req.path.includes("/files/") ? next() : json(req, res, next),
);
app.use("/api", loadSession);
for (const router of [
  usersRouter,
  orgsRouter,
  reposRouter,
  problemsRouter,
  solutionsRouter,
  contributionsRouter,
  licensesRouter,
  searchRouter,
]) {
  app.use("/api", router);
}
app.use("/api", notFoundHandler);
app.use(errorHandler);

await storage.init();
app.listen(env.PORT, () => console.log(`API sur http://localhost:${env.PORT}/api`));
