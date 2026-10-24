import { Router } from "express";
import { parse } from "../../lib/validate.js";
import { searchQuery } from "./schemas.js";
import { search } from "./service.js";

export const searchRouter = Router();

searchRouter.get("/search", async (req, res) => {
  const { q } = parse(searchQuery, req.query);
  res.json(await search(q));
});
