import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverviewPoint, OverviewResponse, WorkoutDto } from "@hh/shared";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/Feedback";
import { StatCard } from "@/components/Stats";
import { WorkoutCard } from "@/components/WorkoutCard";
import { formatVolume, toPersianDigits } from "@/lib/format";

interface OverviewTooltipProps {
  active?: boolean;
  payload?: { payload?: OverviewPoint }[];
}

function OverviewTooltip({ active, payload }: OverviewTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-slate-700">{point.label}</p>
      <p className="mt-1 text-brand-600">{toPersianDigits(point.workoutCount)} تمرین</p>
      <p className="text-slate-500">حجم: {formatVolume(point.volume)} کیلو</p>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [recent, setRecent] = useState<WorkoutDto[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<OverviewResponse>("/api/progress/overview?period=weekly"),
      api<{ workouts: WorkoutDto[] }>("/api/workouts"),
    ])
      .then(([ov, wl]) => {
        if (cancelled) return;
        setOverview(ov);
        setRecent(wl.workouts.slice(0, 3));
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error && !overview) {
    return (
      <div className="p-4">
        <ErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="rounded-3xl bg-gradient-to-bl from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-600/20">
        <h2 className="text-lg font-bold">آماده‌ای تمرین کنی؟</h2>
        <p className="mt-1 text-sm text-brand-100">
          هر ست را همان لحظه ثبت کن تا رشدت را ببینی.
        </p>
        <Link
          to="/workouts/new"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-brand-700 shadow transition hover:bg-brand-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          شروع تمرین جدید
        </Link>
      </section>

      {!overview ? (
        <Spinner label="در حال بارگذاری آمار" />
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2">
            <StatCard
              label="این هفته"
              value={`${toPersianDigits(overview.summary.workoutsThisWeek)}`}
              hint="تمرین"
            />
            <StatCard
              label="هفته قبل"
              value={`${toPersianDigits(overview.summary.workoutsPrevWeek)}`}
              hint="تمرین"
            />
            <StatCard
              label="میانگین هفتگی"
              value={toPersianDigits(overview.summary.avgWorkoutsPerWeek)}
              hint="۴ هفته اخیر"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">تمرین‌های ۱۲ هفته اخیر</h2>
              <Link to="/progress" className="text-xs font-bold text-brand-600 hover:underline">
                همه آمار
              </Link>
            </div>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={overview.points} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                    interval={2}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: number | string) => toPersianDigits(String(v))}
                    width={24}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<OverviewTooltip />} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="workoutCount" fill="#1b5ff5" radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span>کل دوره: {toPersianDigits(overview.summary.totalWorkouts)} تمرین</span>
              <span>حجم: {formatVolume(overview.summary.volumeThisPeriod)} کیلو</span>
            </div>
          </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-700">آخرین تمرین‌ها</h2>
          <Link to="/workouts" className="text-xs font-bold text-brand-600 hover:underline">
            مشاهده همه
          </Link>
        </div>

        {!recent ? (
          <Spinner label="در حال بارگذاری" />
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
            هنوز تمرینی ثبت نکرده‌اید.
          </div>
        ) : (
          recent.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)
        )}
      </section>
    </div>
  );
}
