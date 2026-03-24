import { ApiError } from "../utils/apiError.js";

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  if (error?.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists." });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error?.message || "Internal server error.";

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ message });
}
