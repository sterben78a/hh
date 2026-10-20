import { useNavigate } from "react-router-dom";
import type { WorkoutDto } from "@hh/shared";
import { api } from "@/lib/api";
import WorkoutForm, { type WorkoutFormValues } from "@/components/WorkoutForm";

export default function NewWorkoutPage() {
  const navigate = useNavigate();

  const handleSubmit = async (values: WorkoutFormValues) => {
    const workout = await api<WorkoutDto>("/api/workouts", {
      method: "POST",
      body: values,
    });
    navigate(`/workouts/${workout.id}`, { replace: true });
  };

  return (
    <div>
      <div className="border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-bold text-slate-900">تمرین جدید</h1>
      </div>
      <WorkoutForm submitLabel="ذخیره تمرین" onSubmit={handleSubmit} />
    </div>
  );
}
