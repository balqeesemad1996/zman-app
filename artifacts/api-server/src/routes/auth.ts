import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/auth/verify", (req, res) => {
  const passcode = process.env.PASSCODE;
  if (!passcode) {
    res.status(500).json({ error: "PASSCODE not configured" });
    return;
  }
  const { passcode: submitted } = req.body as { passcode?: string };
  if (!submitted || submitted !== passcode) {
    res.status(401).json({ error: "رمز الدخول غير صحيح" });
    return;
  }
  res.json({ status: "ok" });
});

export default router;
