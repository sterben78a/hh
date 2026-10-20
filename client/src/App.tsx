import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { Spinner } from "@/components/Feedback";
import DashboardPage from "@/pages/DashboardPage";
import EditWorkoutPage from "@/pages/EditWorkoutPage";
import HistoryPage from "@/pages/HistoryPage";
import LoginPage from "@/pages/LoginPage";
import NewWorkoutPage from "@/pages/NewWorkoutPage";
import ProgressPage from "@/pages/ProgressPage";
import RegisterPage from "@/pages/RegisterPage";
import WorkoutDetailPage from "@/pages/WorkoutDetailPage";

function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenSpinner />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenSpinner />;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <RegisterPage />
            </RedirectIfAuthed>
          }
        />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="workouts" element={<HistoryPage />} />
            <Route path="workouts/new" element={<NewWorkoutPage />} />
            <Route path="workouts/:id" element={<WorkoutDetailPage />} />
            <Route path="workouts/:id/edit" element={<EditWorkoutPage />} />
            <Route path="progress" element={<ProgressPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
