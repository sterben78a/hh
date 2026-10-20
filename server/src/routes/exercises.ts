import { Router } from "express";
import { createExerciseSchema, type ExerciseDto } from "@hh/shared";
import { prisma } from "../db";
import { ApiError, readBody } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth);

exercisesRouter.get("/", async (req, res) => {
  const userId = req.user!.id;

  const [catalog, custom, recentWorkouts] = await Promise.all([
    prisma.exercise.findMany({
      where: { isCustom: false, userId: null },
      orderBy: { nameFa: "asc" },
    }),
    prisma.exercise.findMany({
      where: { isCustom: true, userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workout.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        exercises: { include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } } },
      },
    }),
  ]);

  const lastSetByExercise = new Map<string, { weightKg: number; reps: number }>();
  for (const workout of recentWorkouts) {
    for (const we of workout.exercises) {
      if (lastSetByExercise.has(we.exerciseId)) continue;
      const last = we.sets.at(-1);
      if (last) {
        lastSetByExercise.set(we.exerciseId, { weightKg: last.weightKg, reps: last.reps });
      }
    }
  }

  const toDto = (e: { id: string; nameFa: string; isCustom: boolean }): ExerciseDto => ({
    id: e.id,
    nameFa: e.nameFa,
    isCustom: e.isCustom,
    lastSet: lastSetByExercise.get(e.id) ?? null,
  });

  res.json({ exercises: [...custom, ...catalog].map(toDto) });
});

exercisesRouter.post("/", async (req, res) => {
  const input = readBody(createExerciseSchema, req);
  const userId = req.user!.id;

  const duplicate = await prisma.exercise.findFirst({
    where: {
      nameFa: input.nameFa,
      OR: [
        { isCustom: true, userId },
        { isCustom: false, userId: null },
      ],
    },
  });
  if (duplicate) {
    throw new ApiError(409, "این حرکت از قبل موجود است");
  }

  const exercise = await prisma.exercise.create({
    data: { nameFa: input.nameFa, isCustom: true, userId },
  });

  res.status(201).json({
    id: exercise.id,
    nameFa: exercise.nameFa,
    isCustom: true,
    lastSet: null,
  } satisfies ExerciseDto);
});
