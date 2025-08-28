// src/types/index.d.ts
import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      sub: string;
      role: "MANAGER" | "MEMBER";
    };
  }
}


// Fallback declaration to satisfy TS if openai types are not resolved
declare module "openai";


