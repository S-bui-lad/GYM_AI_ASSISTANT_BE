// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export interface JwtPayload {
  sub: string;
  role: "MANAGER" | "MEMBER";
}

// Thêm kiểu RequestWithUser để mở rộng Request có thuộc tính user
type RequestWithUser = Request & { user?: JwtPayload };

export function auth(required = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: "Unauthorized: token missing" });
    }

    try {
      const payload = verifyToken<JwtPayload>(token);

      // Ép kiểu req sang RequestWithUser để gán user
      (req as RequestWithUser).user = payload;

      return next();
    } catch (err) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }
  };
}
