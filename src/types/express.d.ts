declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        role: "MANAGER" | "MEMBER";
      };
    }
  }
}
export {};

