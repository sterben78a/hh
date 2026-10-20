import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { WorkoutDto } from "@hh/shared";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/Feedback";
import WorkoutForm, { type WorkoutFormValues } from "@/components/WorkoutForm";

export default function EditWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<WorkoutDto | null>(null);
  const [error, setError] = useState<unknown>(null);

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

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (!workout) {
    return <Spinner label="در حال بارگذاری تمرین" />;
  }

  const handleSubmit = async (values: WorkoutFormValues) => {
    await api<WorkoutDto>(`/api/workouts/${workout.id}`, {
      method: "PATCH",
      body: values,
    });
    navigate(`/workouts/${workout.id}`, { replace: true });
  };

  return (
    <div>
      <div className="border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-bold text-slate-900">ویرایش تمرین</h1>
      </div>
      <WorkoutForm initial={workout} submitLabel="ذخیره تغییرات" onSubmit={handleSubmit} />
    </div>
  );
}
