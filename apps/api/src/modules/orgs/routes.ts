import { Router } from "express";
import { requireUser } from "../../middleware/session.js";
import { parse } from "../../lib/validate.js";
import { addMember, createOrg, memberParams, orgParams } from "./schemas.js";
import * as service from "./service.js";

export const orgsRouter = Router();

orgsRouter.post("/orgs", async (req, res) => {
  const user = requireUser(req);
  res.status(201).json(await service.createOrg(parse(createOrg, req.body), user.id));
});

orgsRouter.get("/orgs/:slug", async (req, res) => {
  const { slug } = parse(orgParams, req.params);
  res.json(await service.orgDetail(slug, req.user?.id));
});

orgsRouter.post("/orgs/:slug/members", async (req, res) => {
  const user = requireUser(req);
  const { slug } = parse(orgParams, req.params);
  res.json(await service.addMember(slug, parse(addMember, req.body), user.id));
});

orgsRouter.delete("/orgs/:slug/members/:username", async (req, res) => {
  const user = requireUser(req);
  const { slug, username } = parse(memberParams, req.params);
  await service.removeMember(slug, username, user.id);
  res.status(204).end();
});
