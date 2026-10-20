import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ExerciseDto, SetInput, WorkoutDto, WorkoutExerciseInput } from "@hh/shared";
import { api, ApiError } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/Feedback";
import { formatSet, normalizeNumericInput, parseNumeric, toPersianDigits } from "@/lib/format";

interface SetRow {
  weightKg: string;
  reps: string;
}

interface ExerciseBlock {
  exerciseId: string;
  nameFa: string;
  sets: SetRow[];
  lastSet: { weightKg: number; reps: number } | null;
}

export interface WorkoutFormValues {
  startedAt: string;
  note: string;
  exercises: WorkoutExerciseInput[];
}

interface WorkoutFormProps {
  initial?: WorkoutDto;
  submitLabel: string;
  onSubmit: (values: WorkoutFormValues) => Promise<void>;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NumericInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      dir="ltr"
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(normalizeNumericInput(e.target.value))}
      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-base outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
    />
  );
}

export default function WorkoutForm({ initial, submitLabel, onSubmit }: WorkoutFormProps) {
  const [exercises, setExercises] = useState<ExerciseDto[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [blocks, setBlocks] = useState<ExerciseBlock[]>(() =>
    initial
      ? initial.exercises.map((we) => ({
          exerciseId: we.exerciseId,
          nameFa: we.exerciseName,
          sets: we.sets.map((s) => ({
            weightKg: String(s.weightKg),
            reps: String(s.reps),
          })),
          lastSet: null,
        }))
      : [],
  );
  const [startedAt, setStartedAt] = useState(() =>
    toLocalInputValue(initial?.startedAt ?? new Date().toISOString()),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [customName, setCustomName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ exercises: ExerciseDto[] }>("/api/exercises")
      .then((data) => {
        if (!cancelled) setExercises(data.exercises);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    const q = filter.trim();
    if (!q) return exercises;
    return exercises.filter((e) => e.nameFa.includes(q));
  }, [exercises, filter]);

  const addBlock = (exercise: ExerciseDto) => {
    setBlocks((prev) => {
      if (prev.some((b) => b.exerciseId === exercise.id)) return prev;
      const seed = exercise.lastSet;
      return [
        ...prev,
        {
          exerciseId: exercise.id,
          nameFa: exercise.nameFa,
          sets: [
            {
              weightKg: seed ? String(seed.weightKg) : "",
              reps: seed ? String(seed.reps) : "",
            },
          ],
          lastSet: seed,
        },
      ];
    });
    setPickerOpen(false);
    setFilter("");
  };

  const removeBlock = (exerciseId: string) => {
    setBlocks((prev) => prev.filter((b) => b.exerciseId !== exerciseId));
  };

  const updateSet = (exerciseId: string, index: number, patch: Partial<SetRow>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.exerciseId === exerciseId
          ? { ...b, sets: b.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) }
          : b,
      ),
    );
  };

  const addSet = (exerciseId: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.exerciseId !== exerciseId) return b;
        const last = b.sets.at(-1);
        return {
          ...b,
          sets: [...b.sets, { weightKg: last?.weightKg ?? "", reps: last?.reps ?? "" }],
        };
      }),
    );
  };

  const removeSet = (exerciseId: string, index: number) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.exerciseId !== exerciseId) return b;
        if (b.sets.length === 1) return b;
        return { ...b, sets: b.sets.filter((_, i) => i !== index) };
      }),
    );
  };

  const createCustomExercise = async () => {
    const name = customName.trim();
    if (!name) return;
    try {
      const created = await api<ExerciseDto>("/api/exercises", {
        method: "POST",
        body: { nameFa: name },
      });
      setExercises((prev) => [created, ...(prev ?? [])]);
      setCustomName("");
      addBlock(created);
    } catch (err) {
      setSubmitError(err);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitError(null);

    if (blocks.length === 0) {
      setFormError("حداقل یک حرکت به تمرین اضافه کنید");
      return;
    }

    const exercisesPayload: WorkoutExerciseInput[] = [];
    for (const block of blocks) {
      const sets: SetInput[] = [];
      for (const [index, row] of block.sets.entries()) {
        const weight = parseNumeric(row.weightKg);
        const reps = parseNumeric(row.reps);
        if (weight === null || weight < 0) {
          setFormError(`وزن ست ${toPersianDigits(index + 1)} «${block.nameFa}» را وارد کنید`);
          return;
        }
        if (reps === null || !Number.isInteger(reps) || reps < 1) {
          setFormError(`تکرار ست ${toPersianDigits(index + 1)} «${block.nameFa}» را وارد کنید`);
          return;
        }
        sets.push({ weightKg: weight, reps });
      }
      exercisesPayload.push({ exerciseId: block.exerciseId, sets });
    }

    setSubmitting(true);
    try {
      await onSubmit({
        startedAt: new Date(startedAt).toISOString(),
        note: note.trim(),
        exercises: exercisesPayload,
      });
    } catch (err) {
      setSubmitError(err);
      if (err instanceof ApiError && err.status === 401) {
        setSubmitError(new Error("نشست شما منقضی شده است؛ دوباره وارد شوید"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-4">
        <ErrorBanner error={loadError} />
      </div>
    );
  }

  if (!exercises) {
    return <Spinner />;
  }

  const inputClass =
    "rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-base outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <ErrorBanner error={submitError} />
      {formError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          تاریخ و ساعت
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className={`${inputClass} bg-white`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          یادداشت (اختیاری)
          <input
            type="text"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً حجم تمرین"
            className={`${inputClass} bg-white`}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {blocks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            هنوز حرکتی اضافه نشده است
          </div>
        )}

        {blocks.map((block) => (
          <section key={block.exerciseId} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <header className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900">{block.nameFa}</h3>
                {block.lastSet && (
                  <p className="text-[11px] text-slate-400">
                    آخرین ست: {formatSet(block.lastSet.weightKg, block.lastSet.reps)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeBlock(block.exerciseId)}
                aria-label={`حذف ${block.nameFa}`}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                حذف
              </button>
            </header>

            <div className="mb-1.5 grid grid-cols-[2.5rem_1fr_1rem_1fr_2rem] items-center gap-1.5 px-1 text-[11px] text-slate-400">
              <span className="text-center">ست</span>
              <span className="text-center">وزن (کیلو)</span>
              <span />
              <span className="text-center">تکرار</span>
              <span />
            </div>

            <div className="flex flex-col gap-1.5">
              {block.sets.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[2.5rem_1fr_1rem_1fr_2rem] items-center gap-1.5"
                >
                  <span className="text-center text-sm font-medium text-slate-500">
                    {toPersianDigits(index + 1)}
                  </span>
                  <NumericInput
                    value={row.weightKg}
                    onChange={(next) => updateSet(block.exerciseId, index, { weightKg: next })}
                    placeholder="0"
                    ariaLabel={`وزن ست ${index + 1}`}
                  />
                  <span className="text-center text-slate-400">×</span>
                  <NumericInput
                    value={row.reps}
                    onChange={(next) => updateSet(block.exerciseId, index, { reps: next })}
                    placeholder="0"
                    ariaLabel={`تکرار ست ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSet(block.exerciseId, index)}
                    disabled={block.sets.length === 1}
                    aria-label={`حذف ست ${index + 1}`}
                    className="flex h-7 w-7 items-center justify-center justify-self-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addSet(block.exerciseId)}
              className="mt-2 w-full rounded-lg border border-dashed border-brand-300 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-50"
            >
              + ست دیگر
            </button>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-brand-300 py-3 text-sm font-bold text-brand-600 transition hover:bg-brand-50"
      >
        + افزودن حرکت
      </button>

      <button
        type="submit"
        disabled={submitting}
        className="sticky bottom-20 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "در حال ذخیره…" : submitLabel}
      </button>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0"
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

            <div className="max-h-[50dvh] overflow-y-auto p-2">
              {filteredExercises.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-400">حرکتی پیدا نشد</p>
              )}
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => addBlock(exercise)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-start text-sm transition hover:bg-brand-50"
                >
                  <span className="font-medium text-slate-800">{exercise.nameFa}</span>
                  {exercise.lastSet && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatSet(exercise.lastSet.weightKg, exercise.lastSet.reps)}
                    </span>
                  )}
                  {exercise.isCustom && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      سفارشی
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="نام حرکت سفارشی…"
                  maxLength={60}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={createCustomExercise}
                  disabled={!customName.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-40"
                >
                  افزودن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
