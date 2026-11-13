import { Router } from "express";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { pendingEmail, userParams } from "./schemas.js";
import * as service from "./service.js";

export const usersRouter = Router();

usersRouter.get("/me/namespaces", async (req, res) => {
  const user = requireUser(req);
  res.json(await service.myNamespaces(user.id, user.username));
});

usersRouter.get("/me/dashboard", async (req, res) => {
  const user = requireUser(req);
  res.json(await service.dashboard(user.id));
});

usersRouter.get("/users/:username", async (req, res) => {
  const { username } = parse(userParams, req.params);
  res.json(await service.profile(username));
});

/**
 * Inscription en attente du code : corrige une adresse mal saisie et envoie un nouveau code.
 * Pas de session à ce stade : le mot de passe choisi à l'inscription prouve la demande.
 */
usersRouter.post("/account/pending-email", async (req, res) => {
  res.json(await service.changePendingEmail(parse(pendingEmail, req.body)));
});
