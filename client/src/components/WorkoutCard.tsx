import { Link } from "react-router-dom";
import type { WorkoutDto } from "@hh/shared";
import { formatJalaliDate, formatTime, formatVolume, formatWeekday, toPersianDigits } from "@/lib/format";

export function WorkoutCard({ workout }: { workout: WorkoutDto }) {
  const names = workout.exercises.map((e) => e.exerciseName);

  return (
    <Link
      to={`/workouts/${workout.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{formatJalaliDate(workout.startedAt)}</p>
          <p className="text-xs text-slate-400">
            {formatWeekday(workout.startedAt)} — {formatTime(workout.startedAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
          {formatVolume(workout.totalVolume)} کیلو
        </span>
      </div>

      <p className="mt-2 truncate text-xs text-slate-500">
        {names.slice(0, 3).join("، ")}
        {names.length > 3 ? ` و ${toPersianDigits(names.length - 3)} حرکت دیگر` : ""}
      </p>

      <div className="mt-2 flex gap-3 text-[11px] text-slate-400">
        <span>{toPersianDigits(workout.exercises.length)} حرکت</span>
        <span>{toPersianDigits(workout.setCount)} ست</span>
        {workout.note && <span className="truncate">یادداشت دارد</span>}
      </div>
    </Link>
  );
}
