import { ApiError } from "@/lib/api";

export function Spinner({ label = "در حال بارگذاری" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-slate-500">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;

  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "خطای ناشناخته‌ای رخ داد";
  const issues = error instanceof ApiError ? error.issues : [];

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <p className="font-medium">{message}</p>
      {issues.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 ps-5">
          {issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
