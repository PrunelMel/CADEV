import { Router } from "express";
import { addDiscussion, createDiscussion, listDiscussions } from "../../lib/discussions.js";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import {
  addCollaborator,
  collaboratorParams,
  commitQuery,
  createPull,
  createRepo,
  fileParams,
  listQuery,
  pullFileParams,
  pullParams,
  repoParams,
  updateRepo,
  versionQuery,
} from "./schemas.js";
import * as service from "./service.js";

export const reposRouter = Router();
const base = "/repos/:owner/:name";

/* Dépôts */

reposRouter.get("/repos", async (req, res) => {
  res.json(await service.listRepos(parse(listQuery, req.query)));
});

reposRouter.get("/languages", async (_req, res) => {
  res.json(await service.knownLanguages());
});

reposRouter.post("/repos", async (req, res) => {
  const user = requireUser(req);
  res.status(201).json(await service.createRepo(parse(createRepo, req.body), user));
});

reposRouter.get(base, async (req, res) => {
  const { owner, name } = parse(repoParams, req.params);
  const { version } = parse(versionQuery, req.query);
  res.json(await service.repoDetail(owner, name, version, req.user?.id));
});

reposRouter.patch(base, async (req, res) => {
  const user = requireUser(req);
  const { owner, name } = parse(repoParams, req.params);
  res.json(await service.updateRepo(owner, name, parse(updateRepo, req.body), user.id));
});

/* Collaborateurs */

reposRouter.get(`${base}/collaborators`, async (req, res) => {
  const { owner, name } = parse(repoParams, req.params);
  res.json(await service.listCollaborators(owner, name, req.user?.id));
});

reposRouter.post(`${base}/collaborators`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name } = parse(repoParams, req.params);
  const { username } = parse(addCollaborator, req.body);
  res.json(await service.addCollaborator(owner, name, username, user.id));
});

reposRouter.delete(`${base}/collaborators/:username`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, username } = parse(collaboratorParams, req.params);
  await service.removeCollaborator(owner, name, username, user.id);
  res.status(204).end();
});

/* Fichiers et versions. Le corps de la requête PUT est le contenu brut du fichier. */

reposRouter.get(`${base}/versions`, async (req, res) => {
  const { owner, name } = parse(repoParams, req.params);
  res.json(await service.listVersions(owner, name, req.user?.id));
});

reposRouter.get(`${base}/files/*path`, async (req, res) => {
  const { owner, name, path } = parse(fileParams, req.params);
  const { version } = parse(versionQuery, req.query);
  const { file, stream } = await service.downloadFile(owner, name, path, version, req.user?.id);
  const filename = encodeURIComponent(path.split("/").pop() ?? "fichier");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", String(file.size));
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
  res.setHeader("X-Content-SHA256", file.sha256);
  stream.pipe(res);
});

reposRouter.put(`${base}/files/*path`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, path } = parse(fileParams, req.params);
  const { message } = parse(commitQuery, req.query);
  res.status(201).json(await service.uploadFile(owner, name, path, req, message, user.id));
});

reposRouter.delete(`${base}/files/*path`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, path } = parse(fileParams, req.params);
  const { message } = parse(commitQuery, req.query);
  res.json(await service.deleteFile(owner, name, path, message, user.id));
});

/* Likes */

reposRouter.put(`${base}/like`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name } = parse(repoParams, req.params);
  await service.setLike(owner, name, user.id, true);
  res.status(204).end();
});

reposRouter.delete(`${base}/like`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name } = parse(repoParams, req.params);
  await service.setLike(owner, name, user.id, false);
  res.status(204).end();
});

/* Discussions */

reposRouter.get(`${base}/discussions`, async (req, res) => {
  const { owner, name } = parse(repoParams, req.params);
  res.json(await listDiscussions("repo", await service.repoId(owner, name, req.user?.id)));
});

reposRouter.post(`${base}/discussions`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name } = parse(repoParams, req.params);
  const { body } = parse(createDiscussion, req.body);
  const id = await service.repoId(owner, name, user.id);
  res.status(201).json(await addDiscussion("repo", id, user.id, body));
});

/* Pull requests */

reposRouter.get(`${base}/pulls`, async (req, res) => {
  const { owner, name } = parse(repoParams, req.params);
  res.json(await service.listPulls(owner, name, req.user?.id));
});

reposRouter.post(`${base}/pulls`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name } = parse(repoParams, req.params);
  res.status(201).json(await service.createPull(owner, name, parse(createPull, req.body), user.id));
});

reposRouter.get(`${base}/pulls/:number`, async (req, res) => {
  const { owner, name, number } = parse(pullParams, req.params);
  res.json(await service.pullDetail(owner, name, number, req.user?.id));
});

reposRouter.put(`${base}/pulls/:number/files/*path`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, number, path } = parse(pullFileParams, req.params);
  res.status(201).json(await service.uploadPullFile(owner, name, number, path, req, user.id));
});

reposRouter.post(`${base}/pulls/:number/merge`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, number } = parse(pullParams, req.params);
  res.json(await service.mergePull(owner, name, number, user.id));
});

reposRouter.post(`${base}/pulls/:number/close`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, number } = parse(pullParams, req.params);
  await service.closePull(owner, name, number, user.id);
  res.status(204).end();
});

reposRouter.get(`${base}/pulls/:number/discussions`, async (req, res) => {
  const { owner, name, number } = parse(pullParams, req.params);
  res.json(await listDiscussions("pull", await service.pullId(owner, name, number, req.user?.id)));
});

reposRouter.post(`${base}/pulls/:number/discussions`, async (req, res) => {
  const user = requireUser(req);
  const { owner, name, number } = parse(pullParams, req.params);
  const { body } = parse(createDiscussion, req.body);
  const id = await service.pullId(owner, name, number, user.id);
  res.status(201).json(await addDiscussion("pull", id, user.id, body));
});
