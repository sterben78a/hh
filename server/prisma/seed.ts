import { PrismaClient, type Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../.env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
process.env.DATABASE_URL ??= "file:./dev.db";

export const CATALOG = [
  "پرس سینه هالتر",
  "اسکات هالتر",
  "ددلیفت",
  "پرس بالا سر هالتر",
  "زیربغل هالتر خم",
  "پرس پا",
  "جلو بازو هالتر",
  "پشت بازو سیم‌کش",
  "لانج با دمبل",
  "ددلیفت رومانیایی",
  "شنا سوئدی",
  "بارفیکس",
  "کول هالتر",
  "ساق پا ایستاده",
  "فیله کمر",
  "درازنشست",
] as const;

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "کاربر نمونه";

const NOTES = [
  "احساس قدرت خوبی داشتم",
  "ست آخر را کشیدم",
  "گرم‌کاری کامل انجام شد",
  "جهش کوچک نسبت به هفته قبل",
  null,
  null,
  null,
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Plan {
  weekday: number;
  dayLabel: string;
  exercises: { name: string; base: number; step: number; reps: number }[];
}

const PLANS: Plan[] = [
  {
    weekday: 6,
    dayLabel: "شنبه",
    exercises: [
      { name: "پرس سینه هالتر", base: 57.5, step: 2.5, reps: 6 },
      { name: "پرس بالا سر هالتر", base: 37.5, step: 2.5, reps: 8 },
      { name: "پشت بازو سیم‌کش", base: 27.5, step: 2.5, reps: 12 },
      { name: "جلو بازو هالتر", base: 25, step: 2.5, reps: 10 },
    ],
  },
  {
    weekday: 1,
    dayLabel: "دوشنبه",
    exercises: [
      { name: "اسکات هالتر", base: 77.5, step: 2.5, reps: 5 },
      { name: "ددلیفت رومانیایی", base: 67.5, step: 2.5, reps: 8 },
      { name: "پرس پا", base: 120, step: 10, reps: 10 },
      { name: "ساق پا ایستاده", base: 60, step: 5, reps: 12 },
    ],
  },
  {
    weekday: 4,
    dayLabel: "پنجشنبه",
    exercises: [
      { name: "زیربغل هالتر خم", base: 52.5, step: 2.5, reps: 8 },
      { name: "بارفیکس", base: 5, step: 2.5, reps: 8 },
      { name: "کول هالتر", base: 40, step: 2.5, reps: 10 },
      { name: "فیله کمر", base: 15, step: 2.5, reps: 12 },
    ],
  },
];

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

async function seedCatalog(prisma: PrismaClient): Promise<void> {
  for (const nameFa of CATALOG) {
    const existing = await prisma.exercise.findFirst({
      where: { nameFa, isCustom: false, userId: null },
    });
    if (!existing) {
      await prisma.exercise.create({ data: { nameFa, isCustom: false, userId: null } });
    }
  }
  const count = await prisma.exercise.count({ where: { isCustom: false, userId: null } });
  console.info(`catalog ready: ${count} exercises`);
}

async function seedDemoWorkouts(prisma: PrismaClient): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      displayName: DEMO_NAME,
    },
  });

  const existing = await prisma.workout.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.info(`demo user already has ${existing} workouts — skipping history seed`);
    return;
  }

  const rand = mulberry32(20261004);
  const now = new Date();
  const TEHRAN_MS = (3 * 60 + 30) * 60 * 1000;

  const exerciseIds = new Map<string, string>();
  for (const plan of PLANS) {
    for (const ex of plan.exercises) {
      const row = await prisma.exercise.findFirst({ where: { nameFa: ex.name } });
      if (row) exerciseIds.set(ex.name, row.id);
    }
  }

  const earliest = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const firstWeekSaturday = (() => {
    const wall = new Date(earliest.getTime() + TEHRAN_MS);
    const delta = (wall.getUTCDay() - 6 + 7) % 7;
    return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - delta) - TEHRAN_MS);
  })();

  const totalWeeks = Math.floor((now.getTime() - firstWeekSaturday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const skipWeek = Math.floor(rand() * totalWeeks);
  const deloadEvery = 8;

  const workoutCreates: Prisma.WorkoutUncheckedCreateInput[] = [];

  for (let week = 0; week <= totalWeeks; week++) {
    const weekStartMs = firstWeekSaturday.getTime() + week * 7 * 24 * 60 * 60 * 1000;
    const progress = totalWeeks === 0 ? 1 : week / totalWeeks;
    const isDeload = week % deloadEvery === deloadEvery - 1 && week < totalWeeks - 1;

    for (const [planIndex, plan] of PLANS.entries()) {
      const dayMs = weekStartMs + ((plan.weekday + 1) % 7) * 24 * 60 * 60 * 1000;
      // Tehran evening (18:00-19:00 local = +14.5/+15.5h UTC, week start is Tehran midnight)
      const hourOffset = (18 + (planIndex % 2) - 3.5) * 60 * 60 * 1000;
      const startedAt = new Date(dayMs + hourOffset + Math.floor(rand() * 40) * 60 * 1000);
      if (startedAt.getTime() > now.getTime()) continue;
      if (week === skipWeek) continue;

      const growth = 1 + progress * 0.28 + (rand() - 0.5) * 0.03;
      const loadFactor = isDeload ? 0.9 : 1;

      const exercises = plan.exercises.map((ex) => {
        const exerciseId = exerciseIds.get(ex.name);
        const setCount = isDeload ? 3 : 3 + Math.floor(rand() * 2);
        const sets = Array.from({ length: setCount }, (_, i) => {
          const weight = roundTo(ex.base * growth * loadFactor, ex.step);
          const reps = ex.reps + (rand() < 0.3 ? 1 : 0) - (i >= 2 && rand() < 0.4 ? 1 : 0);
          return { weightKg: weight, reps: Math.max(4, reps) };
        });
        return { exerciseId, sets };
      }).filter((e): e is { exerciseId: string; sets: { weightKg: number; reps: number }[] } => !!e.exerciseId);

      if (exercises.length === 0) continue;

      workoutCreates.push({
        userId: user.id,
        startedAt,
        note: NOTES[Math.floor(rand() * NOTES.length)],
        exercises: {
          create: exercises.map((ex, index) => ({
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
      });
    }
  }

  for (let i = 0; i < workoutCreates.length; i += 20) {
    const chunk = workoutCreates.slice(i, i + 20);
    await prisma.$transaction(chunk.map((data) => prisma.workout.create({ data })));
  }

  const saved = await prisma.workout.count({ where: { userId: user.id } });
  console.info(`demo history: ${saved} workouts for ${DEMO_EMAIL}`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedCatalog(prisma);
    await seedDemoWorkouts(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
