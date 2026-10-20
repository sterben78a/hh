import type { Set, Workout, WorkoutExercise, Exercise } from "@prisma/client";
import type {
  ExerciseTrendPoint,
  ExerciseTrendResponse,
  OverviewPoint,
  OverviewResponse,
  Period,
} from "@hh/shared";
import { prisma } from "../db";
import { buildBuckets, weekStart, type TimeBucket } from "../lib/dates";
import { ApiError } from "../lib/http";

export type WorkoutWithRels = Workout & {
  exercises: (WorkoutExercise & { exercise: Exercise; sets: Set[] })[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function bucketIndexFor(buckets: TimeBucket[], at: Date): number {
  const t = at.getTime();
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i]!;
    if (t >= bucket.start.getTime() && t < bucket.end.getTime()) return i;
  }
  return -1;
}

export function buildExerciseTrend(
  workouts: WorkoutWithRels[],
  buckets: TimeBucket[],
  exerciseId: string,
): { points: ExerciseTrendPoint[]; summary: ExerciseTrendResponse["summary"] } {
  const points: ExerciseTrendPoint[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    topSet: null,
    volume: 0,
    setCount: 0,
  }));

  let bestEver: number | null = null;

  for (const workout of workouts) {
    for (const we of workout.exercises) {
      if (we.exerciseId !== exerciseId) continue;

      const index = bucketIndexFor(buckets, workout.startedAt);

      for (const set of we.sets) {
        if (bestEver === null || set.weightKg > bestEver) bestEver = set.weightKg;
        if (index < 0) continue;

        const point = points[index]!;
        point.volume += set.weightKg * set.reps;
        point.setCount += 1;
        if (point.topSet === null || set.weightKg > point.topSet) point.topSet = set.weightKg;
      }
    }
  }

  for (const point of points) {
    point.volume = round1(point.volume);
  }

  const withData = points.filter((p) => p.topSet !== null);
  const currentBest = withData.length > 0 ? withData[withData.length - 1]!.topSet : null;
  const previousBest = withData.length > 1 ? withData[withData.length - 2]!.topSet : null;
  const changePercent =
    currentBest !== null && previousBest !== null && previousBest > 0
      ? round1(((currentBest - previousBest) / previousBest) * 100)
      : null;

  const totalVolume = round1(points.reduce((sum, p) => sum + p.volume, 0));

  return {
    points,
    summary: {
      currentBest,
      previousBest,
      changePercent,
      bestEver,
      totalVolume,
    },
  };
}

export function buildOverview(
  workouts: WorkoutWithRels[],
  buckets: TimeBucket[],
  now: Date,
): { points: OverviewPoint[]; summary: OverviewResponse["summary"] } {
  const points: OverviewPoint[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    workoutCount: 0,
    volume: 0,
  }));

  const windowStartMs = buckets[0]!.start.getTime();
  const lastBucket = buckets[buckets.length - 1]!;
  const windowEndMs = lastBucket.end.getTime();

  let volumeThisPeriod = 0;
  let totalWorkouts = 0;

  for (const workout of workouts) {
    let workoutVolume = 0;
    for (const we of workout.exercises) {
      for (const set of we.sets) {
        workoutVolume += set.weightKg * set.reps;
      }
    }

    const index = bucketIndexFor(buckets, workout.startedAt);
    if (index >= 0) {
      points[index]!.workoutCount += 1;
      points[index]!.volume += workoutVolume;
    }

    const t = workout.startedAt.getTime();
    if (t >= windowStartMs && t < windowEndMs) {
      volumeThisPeriod += workoutVolume;
      totalWorkouts += 1;
    }
  }

  for (const point of points) {
    point.volume = round1(point.volume);
  }

  const thisWeekStart = weekStart(now).getTime();
  const thisWeekEnd = thisWeekStart + 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;

  let workoutsThisWeek = 0;
  let workoutsPrevWeek = 0;
  let workoutsLast28Days = 0;
  const last28Start = now.getTime() - 28 * 24 * 60 * 60 * 1000;

  for (const workout of workouts) {
    const t = workout.startedAt.getTime();
    if (t >= thisWeekStart && t < thisWeekEnd) workoutsThisWeek += 1;
    else if (t >= prevWeekStart && t < thisWeekStart) workoutsPrevWeek += 1;
    if (t >= last28Start && t <= now.getTime()) workoutsLast28Days += 1;
  }

  return {
    points,
    summary: {
      workoutsThisWeek,
      workoutsPrevWeek,
      avgWorkoutsPerWeek: round1(workoutsLast28Days / 4),
      volumeThisPeriod: round1(volumeThisPeriod),
      totalWorkouts,
    },
  };
}

async function fetchWorkouts(userId: string): Promise<WorkoutWithRels[]> {
  return prisma.workout.findMany({
    where: { userId },
    orderBy: { startedAt: "asc" },
    include: {
      exercises: {
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
}

export async function getExerciseTrend(
  userId: string,
  exerciseId: string,
  period: Period,
): Promise<ExerciseTrendResponse> {
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [
        { isCustom: false, userId: null },
        { isCustom: true, userId },
      ],
    },
  });
  if (!exercise) {
    throw new ApiError(404, "حرکت مورد نظر پیدا نشد");
  }

  const workouts = await fetchWorkouts(userId);
  const buckets = buildBuckets(period);
  const { points, summary } = buildExerciseTrend(workouts, buckets, exerciseId);

  return {
    exerciseId,
    exerciseName: exercise.nameFa,
    period,
    points,
    summary,
  };
}

export async function getOverview(
  userId: string,
  period: Period,
  now: Date = new Date(),
): Promise<OverviewResponse> {
  const workouts = await fetchWorkouts(userId);
  const buckets = buildBuckets(period, now);
  const { points, summary } = buildOverview(workouts, buckets, now);

  return { period, points, summary };
}
