import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { WorkoutDto } from "@hh/shared";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/Feedback";
import {
  formatJalaliDate,
  formatTime,
  formatVolume,
  formatWeekday,
  toPersianDigits,
} from "@/lib/format";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<WorkoutDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<WorkoutDto>(`/api/workouts/${id}`)
      .then((data) => {
        if (!cancelled) setWorkout(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!workout) return;
    setDeleting(true);
    try {
      await api(`/api/workouts/${workout.id}`, { method: "DELETE" });
      navigate("/workouts", { replace: true });
    } catch (err) {
      setError(err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (error && !workout) {
    return (
      <div className="p-4">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (!workout) {
    return <Spinner label="در حال بارگذاری تمرین" />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <ErrorBanner error={error} />

      <header className="rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-base font-bold">{formatJalaliDate(workout.startedAt)}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatWeekday(workout.startedAt)} — ساعت {formatTime(workout.startedAt)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-white/10 px-2.5 py-1">
            حجم کل: {formatVolume(workout.totalVolume)} کیلو
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1">
            {toPersianDigits(workout.setCount)} ست
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1">
            {toPersianDigits(workout.exercises.length)} حرکت
          </span>
        </div>
        {workout.note && <p className="mt-3 text-xs text-slate-300">{workout.note}</p>}
      </header>

      <div className="flex flex-col gap-3">
        {workout.exercises.map((ex) => (
          <section key={ex.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-slate-900">{ex.exerciseName}</h3>
            <div className="flex flex-col gap-1.5">
              {ex.sets.map((set) => (
                <div
                  key={set.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="text-xs font-medium text-slate-400">
                    ست {toPersianDigits(set.setNumber)}
                  </span>
                  <span className="font-bold text-slate-800" dir="ltr">
                    {formatVolume(set.weightKg)} × {toPersianDigits(set.reps)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          to={`/workouts/${workout.id}/edit`}
          className="flex-1 rounded-xl border border-slate-300 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          ویرایش
        </Link>
        {confirmDelete ? (
          <div className="flex flex-1 gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "در حال حذف…" : "بله، حذف شود"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              انصراف
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            حذف تمرین
          </button>
        )}
      </div>
    </div>
  );
}
