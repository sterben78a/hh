import { Router } from "express";
import { progressQuerySchema } from "@hh/shared";
import { readQuery } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { getExerciseTrend, getOverview } from "../services/progress";

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get("/overview", async (req, res) => {
  const { period } = readQuery(progressQuerySchema, req);
  res.json(await getOverview(req.user!.id, period));
});

progressRouter.get("/exercise/:exerciseId", async (req, res) => {
  const { period } = readQuery(progressQuerySchema, req);
  res.json(await getExerciseTrend(req.user!.id, req.params.exerciseId, period));
});
