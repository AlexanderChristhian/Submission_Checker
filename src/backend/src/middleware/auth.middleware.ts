import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { config } from "../config/index.js";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError("Authentication required", 401));
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, config.JWT_SECRET);
    (req as Record<string, unknown>).user = decoded;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}
