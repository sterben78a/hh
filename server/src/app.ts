import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env";
import { errorHandler, notFoundHandler } from "./lib/http";
import { authRouter } from "./routes/auth";
import { exercisesRouter } from "./routes/exercises";
import { progressRouter } from "./routes/progress";
import { workoutsRouter } from "./routes/workouts";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/exercises", exercisesRouter);
  app.use("/api/workouts", workoutsRouter);
  app.use("/api/progress", progressRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
