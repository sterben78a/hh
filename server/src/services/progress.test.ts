import { describe, expect, it } from "vitest";
import type { Exercise, Set, Workout, WorkoutExercise } from "@prisma/client";
import { buildBuckets } from "../lib/dates";
import { buildExerciseTrend, buildOverview } from "./progress";
import type { WorkoutWithRels } from "./progress";

const NOW = new Date("2026-10-04T12:00:00Z");
const EXERCISE_ID = "ex-squat";

function makeSet(id: string, setNumber: number, weightKg: number, reps: number): Set {
  return { id, workoutExerciseId: "we-1", setNumber, weightKg, reps };
}

function makeWorkout(
  id: string,
  startedAtIso: string,
  setsByExercise: Record<string, { weightKg: number; reps: number }[]>,
): WorkoutWithRels {
  const workout: Workout = {
    id,
    userId: "user-1",
    startedAt: new Date(startedAtIso),
    note: null,
    createdAt: new Date(startedAtIso),
  };

  const exercises: (WorkoutExercise & { exercise: Exercise; sets: Set[] })[] = [];
  let order = 0;
  for (const [exerciseId, rawSets] of Object.entries(setsByExercise)) {
    const weId = `${id}-we-${order}`;
    exercises.push({
      id: weId,
      workoutId: id,
      exerciseId,
      order: order++,
      exercise: {
        id: exerciseId,
        nameFa: "حرکت",
        isCustom: false,
        userId: null,
        createdAt: new Date(startedAtIso),
      },
      sets: rawSets.map((s, i) => makeSet(`${weId}-s${i}`, i + 1, s.weightKg, s.reps)),
    });
  }

  return { ...workout, exercises };
}

describe("buildExerciseTrend", () => {
  const buckets = buildBuckets("weekly", NOW);

  it("returns null topSet for weeks without data", () => {
    const result = buildExerciseTrend([], buckets, EXERCISE_ID);
    expect(result.points).toHaveLength(12);
    expect(result.points.every((p) => p.topSet === null)).toBe(true);
    expect(result.summary.currentBest).toBeNull();
    expect(result.summary.bestEver).toBeNull();
  });

  it("computes topSet, volume and change between consecutive data points", () => {
    const workouts = [
      makeWorkout("w1", "2026-09-30T12:00:00Z", {
        [EXERCISE_ID]: [
          { weightKg: 70, reps: 5 },
          { weightKg: 80, reps: 3 },
        ],
      }),
      makeWorkout("w2", "2026-10-03T12:00:00Z", {
        [EXERCISE_ID]: [{ weightKg: 85, reps: 3 }],
      }),
    ];

    const result = buildExerciseTrend(workouts, buckets, EXERCISE_ID);

    expect(result.points[10]!.topSet).toBe(80);
    expect(result.points[10]!.volume).toBe(70 * 5 + 80 * 3);
    expect(result.points[10]!.setCount).toBe(2);
    expect(result.points[11]!.topSet).toBe(85);
    expect(result.points[11]!.volume).toBe(255);

    expect(result.summary.currentBest).toBe(85);
    expect(result.summary.previousBest).toBe(80);
    expect(result.summary.changePercent).toBe(6.3);
    expect(result.summary.totalVolume).toBe(70 * 5 + 80 * 3 + 255);
  });

  it("counts bestEver across all time, even outside the window", () => {
    const workouts = [
      makeWorkout("old", "2025-11-01T12:00:00Z", {
        [EXERCISE_ID]: [{ weightKg: 100, reps: 1 }],
      }),
      makeWorkout("recent", "2026-10-03T12:00:00Z", {
        [EXERCISE_ID]: [{ weightKg: 85, reps: 3 }],
      }),
    ];

    const result = buildExerciseTrend(workouts, buckets, EXERCISE_ID);

    expect(result.summary.bestEver).toBe(100);
    expect(result.summary.currentBest).toBe(85);
    expect(result.summary.totalVolume).toBe(85 * 3);
  });

  it("ignores other exercises", () => {
    const workouts = [
      makeWorkout("w1", "2026-10-03T12:00:00Z", {
        "ex-other": [{ weightKg: 200, reps: 1 }],
      }),
    ];
    const result = buildExerciseTrend(workouts, buckets, EXERCISE_ID);
    expect(result.summary.bestEver).toBeNull();
    expect(result.summary.totalVolume).toBe(0);
  });
});

describe("buildOverview", () => {
  const buckets = buildBuckets("weekly", NOW);

  it("aggregates workouts and volume per bucket", () => {
    const workouts = [
      makeWorkout("w1", "2026-09-30T12:00:00Z", {
        [EXERCISE_ID]: [{ weightKg: 80, reps: 5 }],
      }),
      makeWorkout("w2", "2026-10-03T12:00:00Z", {
        [EXERCISE_ID]: [
          { weightKg: 85, reps: 3 },
          { weightKg: 85, reps: 3 },
        ],
      }),
    ];

    const result = buildOverview(workouts, buckets, NOW);

    expect(result.points[10]!.workoutCount).toBe(1);
    expect(result.points[10]!.volume).toBe(400);
    expect(result.points[11]!.workoutCount).toBe(1);
    expect(result.points[11]!.volume).toBe(510);
    expect(result.points[9]!.workoutCount).toBe(0);
  });

  it("separates this week from last week and averages the last 28 days", () => {
    const workouts = [
      makeWorkout("this-week", "2026-10-03T12:00:00Z", { [EXERCISE_ID]: [] }),
      makeWorkout("prev-week", "2026-09-30T12:00:00Z", { [EXERCISE_ID]: [] }),
      makeWorkout("outside-window", "2026-05-01T12:00:00Z", { [EXERCISE_ID]: [] }),
    ];

    const result = buildOverview(workouts, buckets, NOW);

    expect(result.summary.workoutsThisWeek).toBe(1);
    expect(result.summary.workoutsPrevWeek).toBe(1);
    expect(result.summary.avgWorkoutsPerWeek).toBe(0.5);
    expect(result.summary.totalWorkouts).toBe(2);
    expect(result.summary.volumeThisPeriod).toBe(0);
  });

  it("returns zeroed summary when there is no data", () => {
    const result = buildOverview([], buckets, NOW);
    expect(result.summary).toEqual({
      workoutsThisWeek: 0,
      workoutsPrevWeek: 0,
      avgWorkoutsPerWeek: 0,
      volumeThisPeriod: 0,
      totalWorkouts: 0,
    });
    expect(result.points.every((p) => p.workoutCount === 0)).toBe(true);
  });
});
