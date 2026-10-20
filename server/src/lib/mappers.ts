import type { Set, Workout, WorkoutExercise, Exercise } from "@prisma/client";
import type { WorkoutDto, WorkoutExerciseDto } from "@hh/shared";

type WorkoutWithRels = Workout & {
  exercises: (WorkoutExercise & { exercise: Exercise; sets: Set[] })[];
};

export function toWorkoutDto(workout: WorkoutWithRels): WorkoutDto {
  const exercises: WorkoutExerciseDto[] = workout.exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((we) => ({
      id: we.id,
      exerciseId: we.exerciseId,
      exerciseName: we.exercise.nameFa,
      order: we.order,
      sets: we.sets
        .slice()
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
        })),
    }));

  let totalVolume = 0;
  let setCount = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      totalVolume += set.weightKg * set.reps;
      setCount += 1;
    }
  }

  return {
    id: workout.id,
    startedAt: workout.startedAt.toISOString(),
    note: workout.note,
    exercises,
    totalVolume: Math.round(totalVolume * 10) / 10,
    setCount,
  };
}

export const workoutInclude = {
  exercises: {
    include: {
      exercise: true,
      sets: { orderBy: { setNumber: "asc" as const } },
    },
    orderBy: { order: "asc" as const },
  },
} as const;
