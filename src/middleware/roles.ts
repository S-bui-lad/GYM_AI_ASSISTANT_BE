import { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "./auth";

export const requireRole = (...roles: Array<"MANAGER" | "MEMBER">) =>
  (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
