import type { Request, RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/index.js";
import { unauthorized } from "../lib/errors.js";

export const loadSession: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  req.user = session
    ? { id: session.user.id, username: session.user.username ?? null, name: session.user.name }
    : null;
  next();
};

export function requireUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}
