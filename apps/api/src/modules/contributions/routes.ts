import { Router } from "express";
import { reviewInput } from "../../lib/review.js";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { createContribution, idParams } from "./schemas.js";
import * as service from "./service.js";

export const contributionsRouter = Router();

contributionsRouter.get("/problems/:id/contributions", async (req, res) => {
  const { id } = parse(idParams, req.params);
  res.json(await service.contributionsForProblem(id));
});

contributionsRouter.post("/problems/:id/contributions", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(idParams, req.params);
  const input = parse(createContribution, req.body);
  res.status(201).json(await service.createContribution(id, input, user.id));
});

contributionsRouter.post("/contributions/:id/validate", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(idParams, req.params);
  res.json(await service.validateContribution(id, parse(reviewInput, req.body), user.id));
});
