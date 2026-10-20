import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { WorkoutDto } from "@hh/shared";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/Feedback";
import { WorkoutCard } from "@/components/WorkoutCard";

const monthKeyFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "numeric",
});
const monthLabelFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
});

interface MonthGroup {
  key: string;
  label: string;
  workouts: WorkoutDto[];
}

function groupByMonth(workouts: WorkoutDto[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const workout of workouts) {
    const date = new Date(workout.startedAt);
    const key = monthKeyFormat
      .formatToParts(date)
      .filter((p) => p.type === "year" || p.type === "month")
      .map((p) => p.value)
      .join("-");

    const existing = groups.get(key);
    if (existing) {
      existing.workouts.push(workout);
    } else {
      groups.set(key, {
        key,
        label: monthLabelFormat.format(date),
        workouts: [workout],
      });
    }
  }

  return [...groups.values()];
}

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutDto[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ workouts: WorkoutDto[] }>("/api/workouts")
      .then((data) => {
        if (!cancelled) setWorkouts(data.workouts);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => (workouts ? groupByMonth(workouts) : []), [workouts]);

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (!workouts) {
    return <Spinner label="در حال بارگذاری تاریخچه" />;
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-slate-500">هنوز تمرینی ثبت نکرده‌اید.</p>
        <Link
          to="/workouts/new"
          className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          اولین تمرین را ثبت کنید
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-bold text-slate-500">
            <span>{group.label}</span>
            <span className="text-xs font-normal text-slate-400">
              {group.workouts.length} تمرین
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {group.workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
