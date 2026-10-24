import { Router } from "express";
import { reviewInput } from "../../lib/review.js";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { idParams, submitSolution } from "./schemas.js";
import * as service from "./service.js";

export const solutionsRouter = Router();

solutionsRouter.get("/problems/:id/solutions", async (req, res) => {
  const { id } = parse(idParams, req.params);
  res.json(await service.solutionsForProblem(id));
});

solutionsRouter.post("/problems/:id/solutions", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(idParams, req.params);
  res.status(201).json(await service.submitSolution(id, parse(submitSolution, req.body), user.id));
});

solutionsRouter.post("/solutions/:id/validate", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(idParams, req.params);
  res.json(await service.validateSolution(id, parse(reviewInput, req.body), user.id));
});
