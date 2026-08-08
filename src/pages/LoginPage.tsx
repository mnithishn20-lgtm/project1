import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { login } from '@/lib/db';
import { setProfileId } from '@/lib/supabase';

interface Props {
  onLoggedIn: () => void;
}

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage({ onLoggedIn }: Props) {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (key: keyof LoginForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!form.email.trim()) return 'Please enter your Gmail ID.';
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email)) return 'Please enter a valid Gmail ID.';
    if (!form.password) return 'Please enter your password.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (!data?.id) throw new Error('Login failed. Please try again.');

      setProfileId(String(data.id));
      setSuccess(true);
      setTimeout(() => onLoggedIn(), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 pt-20">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Login Successful!</h2>
          <p className="mt-2 text-slate-400">Taking you to the domains page...</p>
          <Loader2 size={22} className="mx-auto mt-5 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-28 pb-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-md px-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300">
            <LogIn size={14} /> Login Module
          </span>
          <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">Login to QuizIT</h1>
          <p className="mt-3 text-slate-400">Use your registered Gmail ID and password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <Field label="Gmail ID" icon={Mail}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="e.g. arjun@gmail.com"
              className="input"
            />
          </Field>

          <Field label="Password" icon={Lock}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Enter your password"
              className="input"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Logging in...
              </>
            ) : (
              <>
                Login <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(51 65 85);
          background: rgb(15 23 42 / 0.4);
          padding: 0.7rem 1rem;
          font-size: 0.95rem;
          color: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input::placeholder { color: rgb(100 116 139); }
        .input:focus { border-color: rgb(6 182 212); box-shadow: 0 0 0 3px rgb(6 182 212 / 0.15); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Icon size={16} className="text-cyan-400" />
        {label}
        <span className="text-red-400">*</span>
      </label>
      {children}
    </div>
  );
}
