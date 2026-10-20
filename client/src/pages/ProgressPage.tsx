import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExerciseDto, ExerciseTrendPoint, ExerciseTrendResponse, Period } from "@hh/shared";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/Feedback";
import { ChangeBadge, StatCard } from "@/components/Stats";
import { formatSet, formatVolume, formatWeight, toPersianDigits } from "@/lib/format";

const PERIODS: { value: Period; label: string }[] = [
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهانه" },
  { value: "yearly", label: "سالانه" },
];

interface TrendTooltipProps {
  active?: boolean;
  payload?: { payload?: ExerciseTrendPoint }[];
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-slate-700">{point.label}</p>
      {point.topSet !== null ? (
        <>
          <p className="mt-1 text-brand-600">بهترین ست: {formatWeight(point.topSet)} کیلو</p>
          <p className="text-slate-500">حجم: {formatVolume(point.volume)} کیلو</p>
          <p className="text-slate-400">{toPersianDigits(point.setCount)} ست</p>
        </>
      ) : (
        <p className="mt-1 text-slate-400">داده‌ای ثبت نشده</p>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const [exercises, setExercises] = useState<ExerciseDto[] | null>(null);
  const [selected, setSelected] = useState<ExerciseDto | null>(null);
  const [period, setPeriod] = useState<Period>("weekly");
  const [trend, setTrend] = useState<ExerciseTrendResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<{ exercises: ExerciseDto[] }>("/api/exercises")
      .then((data) => {
        if (cancelled) return;
        setExercises(data.exercises);
        setSelected(data.exercises.find((e) => e.lastSet) ?? data.exercises[0] ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setTrend(null);
    api<ExerciseTrendResponse>(
      `/api/progress/exercise/${selected.id}?period=${period}`,
    )
      .then((data) => {
        if (!cancelled) setTrend(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, period]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = filter.trim();
    return q ? exercises.filter((e) => e.nameFa.includes(q)) : exercises;
  }, [exercises, filter]);

  const chartData = useMemo(() => trend?.points ?? [], [trend]);

  const hasAnyData = chartData.some((p) => p.topSet !== null);

  if (error && !trend) {
    return (
      <div className="p-4">
        <ErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold text-slate-900">پیشرفت</h1>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                  period === p.value
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-300"
        >
          <span className="font-bold text-slate-800">
            {selected?.nameFa ?? "انتخاب حرکت"}
          </span>
          <span className="text-xs text-brand-600">تغییر ▾</span>
        </button>
      </div>

      {!trend ? (
        <Spinner label="در حال محاسبه پیشرفت" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="بهترین فعلی"
              value={trend.summary.currentBest !== null ? `${formatVolume(trend.summary.currentBest)}` : "—"}
              hint={<ChangeBadge changePercent={trend.summary.changePercent} />}
            />
            <StatCard
              label="رکورد کل"
              value={trend.summary.bestEver !== null ? formatVolume(trend.summary.bestEver) : "—"}
              hint="کیلوگرم"
            />
            <StatCard
              label="حجم دوره"
              value={formatVolume(trend.summary.totalVolume)}
              hint="کیلو × تکرار"
            />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-slate-700">
              روند بهترین ست — {trend.exerciseName}
            </h2>
            {hasAnyData ? (
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(v: number | string) => toPersianDigits(String(v))}
                      width={40}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#cbd5e1" }} />
                    <Line
                      type="monotone"
                      dataKey="topSet"
                      stroke="#1b5ff5"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#1b5ff5", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                هنوز برای این حرکت داده‌ای ثبت نشده است.
              </p>
            )}
          </section>
        </>
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">انتخاب حرکت</h2>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                >
                  بستن
                </button>
              </div>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="جستجوی حرکت…"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
            <div className="max-h-[55dvh] overflow-y-auto p-2">
              {filtered.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    setSelected(exercise);
                    setPickerOpen(false);
                    setFilter("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-sm transition hover:bg-brand-50 ${
                    selected?.id === exercise.id ? "bg-brand-50 font-bold text-brand-700" : ""
                  }`}
                >
                  <span>{exercise.nameFa}</span>
                  {exercise.lastSet && (
                    <span className="text-xs text-slate-400">
                      {formatSet(exercise.lastSet.weightKg, exercise.lastSet.reps)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
