export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Ressource") =>
  new AppError(404, "not_found", `${what} introuvable`);
export const forbidden = (message = "Action non autorisée") =>
  new AppError(403, "forbidden", message);
export const unauthorized = () => new AppError(401, "unauthorized", "Connexion requise");
export const conflict = (message: string) => new AppError(409, "conflict", message);
export const badRequest = (message: string) => new AppError(400, "bad_request", message);
