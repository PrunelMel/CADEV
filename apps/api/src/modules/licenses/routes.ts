import { Router } from "express";
import { listLicenses } from "./service.js";

export const licensesRouter = Router();

licensesRouter.get("/licenses", async (_req, res) => {
  res.json(await listLicenses());
});
