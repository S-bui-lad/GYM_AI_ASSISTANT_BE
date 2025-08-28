import { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "./auth";

// Placeholder: ensure the authenticated manager is allowed to manage the target gym
// Extend with actual ownership/relationship checks as needed.
export function requireGymManager(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "MANAGER") return res.status(403).json({ message: "Forbidden" });
  return next();
}