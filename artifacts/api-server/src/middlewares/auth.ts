import type { Request, Response, NextFunction } from "express";

const PASSCODE = process.env.PASSCODE;

if (!PASSCODE) {
  throw new Error("PASSCODE environment variable is required but not set. Set it in Replit Secrets.");
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${PASSCODE}`) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  next();
}
