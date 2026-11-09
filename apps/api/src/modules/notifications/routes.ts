import { Router } from "express";
import { parse } from "../../lib/validate.js";
import { requireUser } from "../../middleware/session.js";
import { markRead } from "./schemas.js";
import * as service from "./service.js";

export const notificationsRouter = Router();

notificationsRouter.get("/me/notifications", async (req, res) => {
  const user = requireUser(req);
  res.json(await service.listNotifications(user.id));
});

/** Sans `ids`, marque tout comme lu. */
notificationsRouter.post("/me/notifications/read", async (req, res) => {
  const user = requireUser(req);
  const { ids } = parse(markRead, req.body ?? {});
  res.json(await service.markRead(user.id, ids));
});
