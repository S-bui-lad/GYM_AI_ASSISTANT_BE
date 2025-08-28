import { Router } from "express";
import User from "./user.model";
import { hashPassword, comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyToken } from "../../utils/jwt";

const r = Router();

// register
r.post("/register", async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ message: "Missing fields" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already used" });
    const passwordHash = await hashPassword(password);
    const u = await User.create({ email, name, passwordHash, role });
    res.json({ id: u._id, email: u.email, name: u.name, role: u.role });
  } catch (err) { next(err); }
});

// login
r.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if (!u) return res.status(400).json({ message: "Invalid credentials" });
    const ok = await comparePassword(password, u.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });
    const accessToken = signAccessToken({ sub: u._id, role: u.role });
    const refreshToken = signRefreshToken({ sub: u._id, role: u.role });
    res.json({ accessToken, refreshToken });
  } catch (err) { next(err); }
});

// refresh (simple)
r.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });
  try {
    const payload = verifyToken<any>(refreshToken);
    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

export default r;
