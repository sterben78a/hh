import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "ایمیل الزامی است")
  .email("ایمیل معتبر نیست")
  .max(254, "ایمیل بیش از حد طولانی است");

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(128, "رمز عبور بیش از حد طولانی است");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "نام الزامی است").max(60, "نام بیش از حد طولانی است"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "رمز عبور الزامی است"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const setInputSchema = z.object({
  weightKg: z.number().finite().min(0, "وزن نمی‌تواند منفی باشد").max(1000, "وزن غیرمعتبر است"),
  reps: z.number().int().min(1, "تکرار باید حداقل ۱ باشد").max(1000, "تکرار غیرمعتبر است"),
});
export type SetInput = z.infer<typeof setInputSchema>;

export const workoutExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.array(setInputSchema).min(1, "حداقل یک ست وارد کنید").max(50, "تعداد ست بیش از حد مجاز است"),
});
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseInputSchema>;

const workoutInputSchema = z.object({
  startedAt: z.iso.datetime({ offset: true }).optional(),
  note: z.string().trim().max(1000, "یادداشت بیش از حد طولانی است").optional().or(z.literal("")),
  exercises: z.array(workoutExerciseInputSchema).min(1, "حداقل یک حرکت وارد کنید").max(30),
});

const uniqueExercises = (value: { exercises?: WorkoutExerciseInput[] }): boolean => {
  if (!value.exercises) return true;
  return new Set(value.exercises.map((e) => e.exerciseId)).size === value.exercises.length;
};

export const createWorkoutSchema = workoutInputSchema.refine(uniqueExercises, {
  message: "هر حرکت فقط یک بار می‌تواند در تمرین باشد",
  path: ["exercises"],
});
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const updateWorkoutSchema = workoutInputSchema
  .partial()
  .refine(uniqueExercises, {
    message: "هر حرکت فقط یک بار می‌تواند در تمرین باشد",
    path: ["exercises"],
  });
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export const createExerciseSchema = z.object({
  nameFa: z.string().trim().min(1, "نام حرکت الزامی است").max(60, "نام حرکت بیش از حد طولانی است"),
});
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

export const PERIODS = ["weekly", "monthly", "yearly"] as const;
export type Period = (typeof PERIODS)[number];

export const progressQuerySchema = z.object({
  period: z.enum(PERIODS).default("weekly"),
});
export type ProgressQuery = z.infer<typeof progressQuerySchema>;

export interface Bucket {
  key: string;
  label: string;
  startIso: string;
  endIso: string;
}

export interface ExerciseTrendPoint {
  key: string;
  label: string;
  topSet: number | null;
  volume: number;
  setCount: number;
}

export interface ExerciseTrendResponse {
  exerciseId: string;
  exerciseName: string;
  period: Period;
  points: ExerciseTrendPoint[];
  summary: {
    currentBest: number | null;
    previousBest: number | null;
    changePercent: number | null;
    bestEver: number | null;
    totalVolume: number;
  };
}

export interface OverviewPoint {
  key: string;
  label: string;
  workoutCount: number;
  volume: number;
}

export interface OverviewResponse {
  period: Period;
  points: OverviewPoint[];
  summary: {
    workoutsThisWeek: number;
    workoutsPrevWeek: number;
    avgWorkoutsPerWeek: number;
    volumeThisPeriod: number;
    totalWorkouts: number;
  };
}

export interface SetDto {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
}

export interface WorkoutExerciseDto {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: SetDto[];
}

export interface WorkoutDto {
  id: string;
  startedAt: string;
  note: string | null;
  exercises: WorkoutExerciseDto[];
  totalVolume: number;
  setCount: number;
}

export interface ExerciseDto {
  id: string;
  nameFa: string;
  isCustom: boolean;
  lastSet: { weightKg: number; reps: number } | null;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}
