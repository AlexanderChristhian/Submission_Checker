import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";

// Basic auth middleware placeholder — replace with real JWT verification
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

  // TODO: Verify JWT token and attach user to request
  // const token = authHeader.split(" ")[1];
  // const decoded = jwt.verify(token, config.JWT_SECRET);
  // req.user = decoded;

  next();
}
