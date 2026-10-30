import { Router } from "express";
import { addDiscussion, createDiscussion, listDiscussions } from "../../lib/discussions.js";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { createProblem, declareWork, listQuery, problemParams, updateProblem } from "./schemas.js";
import * as service from "./service.js";

export const problemsRouter = Router();

problemsRouter.get("/problems", async (req, res) => {
  res.json(await service.listProblems(parse(listQuery, req.query)));
});

problemsRouter.get("/problem-countries", async (_req, res) => {
  res.json(await service.countByCountry());
});

problemsRouter.put("/problems/:id/work", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(problemParams, req.params);
  res.json(await service.declareWork(id, parse(declareWork, req.body ?? {}), user.id));
});

problemsRouter.delete("/problems/:id/work", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(problemParams, req.params);
  res.json(await service.withdrawWork(id, user.id));
});

problemsRouter.post("/problems", async (req, res) => {
  const user = requireUser(req);
  res.status(201).json(await service.createProblem(parse(createProblem, req.body), user.id));
});

problemsRouter.get("/problems/:id", async (req, res) => {
  const { id } = parse(problemParams, req.params);
  res.json(await service.problemDetail(id, req.user?.id));
});

problemsRouter.patch("/problems/:id", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(problemParams, req.params);
  res.json(await service.updateProblem(id, parse(updateProblem, req.body), user.id));
});

problemsRouter.get("/problems/:id/suggestions", async (req, res) => {
  const { id } = parse(problemParams, req.params);
  res.json(await service.suggestions(id));
});

problemsRouter.get("/problems/:id/discussions", async (req, res) => {
  const { id } = parse(problemParams, req.params);
  await service.findProblem(id);
  res.json(await listDiscussions("problem", id));
});

problemsRouter.post("/problems/:id/discussions", async (req, res) => {
  const user = requireUser(req);
  const { id } = parse(problemParams, req.params);
  const { body } = parse(createDiscussion, req.body);
  await service.findProblem(id);
  res.status(201).json(await addDiscussion("problem", id, user.id, body));
});
