import type { ReactNode } from "react";
import { toPersianDigits } from "@/lib/format";

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  accent?: "brand" | "green" | "red";
}) {
  const valueColor =
    accent === "green" ? "text-emerald-600" : accent === "red" ? "text-red-600" : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueColor}`} dir="ltr" style={{ textAlign: "start" }}>
        {value}
      </p>
      {hint && <div className="mt-0.5 text-[11px]">{hint}</div>}
    </div>
  );
}

export function ChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) {
    return <span className="text-slate-300">—</span>;
  }
  if (changePercent === 0) {
    return <span className="text-slate-400">بدون تغییر</span>;
  }
  const up = changePercent > 0;
  const abs = toPersianDigits(Math.abs(changePercent).toFixed(1));
  return (
    <span className={up ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
      {up ? "▲" : "▼"} {abs}٪ {up ? "رشد" : "کاهش"}
    </span>
  );
}
