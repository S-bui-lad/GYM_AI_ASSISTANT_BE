// src/modules/users/user.controller.ts
import { Request, Response } from "express";
import  User  from "./user.model";

export async function getMe(req: Request, res: Response) {
  const userId = (req as any).user?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await User.findById(userId).select("email name role gymsManaged");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
}


