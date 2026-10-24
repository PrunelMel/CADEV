import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Route introuvable" } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  // Codes Postgres : 23505 = contrainte d'unicité, 23503 = clé étrangère.
  const pgCode = (err as { cause?: { code?: string } }).cause?.code;
  if (pgCode === "23505") {
    res.status(409).json({ error: { code: "conflict", message: "Cette ressource existe déjà" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Erreur interne" } });
};
