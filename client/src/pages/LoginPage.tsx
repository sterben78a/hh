import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner } from "@/components/Feedback";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 bg-white p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">پیگیری تمرین</h1>
        <p className="mt-1 text-sm text-slate-500">برای ادامه وارد حساب خود شوید</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner error={error} />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          ایمیل
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-start text-base outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          رمز عبور
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-start text-base outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-xl bg-brand-600 py-3 text-base font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "در حال ورود…" : "ورود"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        حساب ندارید؟{" "}
        <Link to="/register" className="font-bold text-brand-600 hover:underline">
          ثبت‌نام کنید
        </Link>
      </p>
    </main>
  );
}
