import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner } from "@/components/Feedback";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password, displayName });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-base outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 bg-white p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">ساخت حساب</h1>
        <p className="mt-1 text-sm text-slate-500">چند ثانیه تا شروع ثبت تمرین‌ها</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner error={error} />

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          نام
          <input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={60}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          ایمیل
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${inputClass} text-start`}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          رمز عبور (حداقل ۸ کاراکتر)
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={`${inputClass} text-start`}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-xl bg-brand-600 py-3 text-base font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "در حال ساخت حساب…" : "ثبت‌نام"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          وارد شوید
        </Link>
      </p>
    </main>
  );
}
