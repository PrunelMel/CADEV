import { Router } from "express";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { idParams, setFeatured } from "./schemas.js";
import * as service from "./service.js";

export const solutionsRouter = Router();

solutionsRouter.get("/problems/:id/solutions", async (req, res) => {
  const { id } = parse(idParams, req.params);
  res.json(await service.solutionsForProblem(id));
});

solutionsRouter.put("/problems/:id/featured", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(idParams, req.params);
  res.json(await service.setFeatured(id, parse(setFeatured, req.body), user.id));
});
