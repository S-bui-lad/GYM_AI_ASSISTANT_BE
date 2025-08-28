import jwt, { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "secret";

type JwtSignPayload = Record<string, unknown>;

export function signAccessToken(
  payload: JwtSignPayload,
  expiresIn: SignOptions["expiresIn"] = "15m" as unknown as SignOptions["expiresIn"]
) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function signRefreshToken(
  payload: JwtSignPayload,
  expiresIn: SignOptions["expiresIn"] = "7d" as unknown as SignOptions["expiresIn"]
) {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as unknown as T;
}
