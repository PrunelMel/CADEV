import { Router } from "express";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { userParams } from "./schemas.js";
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
