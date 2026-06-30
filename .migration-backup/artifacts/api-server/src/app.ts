import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { requireAuth } from "./middlewares/auth";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import businessRouter from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no auth required)
app.use("/api", healthRouter);
app.use("/api", authRouter);

// Protected business routes
app.use("/api", requireAuth, businessRouter);

export default app;
