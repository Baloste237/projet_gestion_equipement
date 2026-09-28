// Erreur métier avec code HTTP explicite (les erreurs `*_NOT_FOUND` historiques restent des Error simples)
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}
