import { Router } from "express";
import { createWorkoutSchema, updateWorkoutSchema } from "@hh/shared";
import type { WorkoutExerciseInput } from "@hh/shared";
import { prisma } from "../db";
import { ApiError, readBody } from "../lib/http";
import { toWorkoutDto, workoutInclude } from "../lib/mappers";
import { requireAuth } from "../middleware/auth";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

async function assertExercisesExist(userId: string, inputs: WorkoutExerciseInput[]): Promise<void> {
  const ids = [...new Set(inputs.map((i) => i.exerciseId))];
  const found = await prisma.exercise.findMany({
    where: {
      id: { in: ids },
      OR: [
        { isCustom: false, userId: null },
        { isCustom: true, userId },
      ],
    },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    throw new ApiError(400, "یکی از حرکت‌های انتخاب‌شده معتبر نیست");
  }
}

async function getOwnedWorkout(userId: string, workoutId: string) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: workoutInclude,
  });
  if (!workout) {
    throw new ApiError(404, "تمرین مورد نظر پیدا نشد");
  }
  return workout;
}

workoutsRouter.get("/", async (req, res) => {
  const workouts = await prisma.workout.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: "desc" },
    include: workoutInclude,
  });
  res.json({ workouts: workouts.map(toWorkoutDto) });
});

workoutsRouter.get("/:id", async (req, res) => {
  const workout = await getOwnedWorkout(req.user!.id, req.params.id);
  res.json(toWorkoutDto(workout));
});

workoutsRouter.post("/", async (req, res) => {
  const input = readBody(createWorkoutSchema, req);
  const userId = req.user!.id;
  await assertExercisesExist(userId, input.exercises);

  const workout = await prisma.workout.create({
    data: {
      userId,
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      note: input.note?.trim() || null,
      exercises: {
        create: input.exercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          order: index,
          sets: {
            create: ex.sets.map((set, setIndex) => ({
              setNumber: setIndex + 1,
              weightKg: set.weightKg,
              reps: set.reps,
            })),
          },
        })),
      },
    },
    include: workoutInclude,
  });

  res.status(201).json(toWorkoutDto(workout));
});

workoutsRouter.patch("/:id", async (req, res) => {
  const input = readBody(updateWorkoutSchema, req);
  const userId = req.user!.id;
  const existing = await getOwnedWorkout(userId, req.params.id);

  if (input.exercises) {
    await assertExercisesExist(userId, input.exercises);
  }

  const workout = await prisma.$transaction(async (tx) => {
    await tx.workout.update({
      where: { id: existing.id },
      data: {
        ...(input.startedAt !== undefined ? { startedAt: new Date(input.startedAt) } : {}),
        ...(input.note !== undefined ? { note: input.note.trim() || null } : {}),
      },
    });

    if (input.exercises) {
      await tx.workoutExercise.deleteMany({ where: { workoutId: existing.id } });
      await tx.workoutExercise.createMany({
        data: input.exercises.map((ex, index) => ({
          workoutId: existing.id,
          exerciseId: ex.exerciseId,
          order: index,
        })),
      });

      const created = await tx.workoutExercise.findMany({
        where: { workoutId: existing.id },
        select: { id: true, exerciseId: true, order: true },
      });
      const byExercise = new Map(created.map((we) => [we.exerciseId, we.id]));

      await tx.set.createMany({
        data: input.exercises.flatMap((ex) => {
          const weId = byExercise.get(ex.exerciseId);
          if (!weId) return [];
          return ex.sets.map((set, setIndex) => ({
            workoutExerciseId: weId,
            setNumber: setIndex + 1,
            weightKg: set.weightKg,
            reps: set.reps,
          }));
        }),
      });
    }

    return tx.workout.findUniqueOrThrow({
      where: { id: existing.id },
      include: workoutInclude,
    });
  });

  res.json(toWorkoutDto(workout));
});

workoutsRouter.delete("/:id", async (req, res) => {
  const userId = req.user!.id;
  const existing = await prisma.workout.findFirst({
    where: { id: req.params.id, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "تمرین مورد نظر پیدا نشد");
  }

  await prisma.workout.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
