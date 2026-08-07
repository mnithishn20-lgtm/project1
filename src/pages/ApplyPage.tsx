import { useState } from 'react';
import { User, Mail, Phone, GraduationCap, Briefcase, LayoutGrid, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { DOMAINS, setProfileId } from '@/lib/supabase';
import { createProfile } from '@/lib/db';

interface Props {
  onApplied: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  education: string;
  experience: string;
  domain_interest: string;
}

const EDUCATION_LEVELS = ['High School', 'Diploma', 'Undergraduate', 'Postgraduate', 'Other'];
const EXPERIENCE_LEVELS = ['Beginner (0-1 yrs)', 'Intermediate (1-3 yrs)', 'Advanced (3-5 yrs)', 'Expert (5+ yrs)'];

export function ApplyPage({ onApplied }: Props) {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    education: '',
    experience: '',
    domain_interest: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (key: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Please enter your name.';
    if (!form.email.trim()) return 'Please enter your email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.education) return 'Please select your education level.';
    if (!form.experience) return 'Please select your experience level.';
    if (!form.domain_interest) return 'Please choose a domain of interest.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await createProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        education: form.education,
        experience: form.experience,
        domain_interest: form.domain_interest,
      });

      if (!data?.id) throw new Error('Failed to create profile.');

      setProfileId(String(data.id));
      setSuccess(true);
      setTimeout(() => onApplied(), 1400);
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
          <h2 className="text-2xl font-bold text-white">Application Submitted!</h2>
          <p className="mt-2 text-slate-400">Your profile is set up. Taking you to the domains page...</p>
          <Loader2 size={22} className="mx-auto mt-5 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-28 pb-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-2xl px-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
            <User size={14} /> Application Form
          </span>
          <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">Tell us about yourself</h1>
          <p className="mt-3 text-slate-400">Fill in your details to create your quiz profile and get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          {/* Name */}
          <Field label="Full Name" icon={User} required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Arjun Kumar"
              className="input"
            />
          </Field>

          {/* Email */}
          <Field label="Email Address" icon={Mail} required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="e.g. arjun@example.com"
              className="input"
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number" icon={Phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="input"
            />
          </Field>

          {/* Education */}
          <Field label="Education" icon={GraduationCap} required>
            <div className="flex flex-wrap gap-2">
              {EDUCATION_LEVELS.map((lvl) => (
                <Chip key={lvl} active={form.education === lvl} onClick={() => update('education', lvl)}>
                  {lvl}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Experience */}
          <Field label="Experience Level" icon={Briefcase} required>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <Chip key={lvl} active={form.experience === lvl} onClick={() => update('experience', lvl)}>
                  {lvl}
                </Chip>
              ))}
            </div>
          </Field>

          {/* Domain interest */}
          <Field label="Domain of Interest" icon={LayoutGrid} required>
            <div className="grid gap-2 sm:grid-cols-2">
              {DOMAINS.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => update('domain_interest', d.name)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    form.domain_interest === d.name
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${form.domain_interest === d.name ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${form.domain_interest === d.name ? 'text-white' : 'text-slate-300'}`}>{d.name}</p>
                    <p className="text-xs text-slate-500">{d.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                Submit Application <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
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
        .input:focus { border-color: rgb(14 165 233); box-shadow: 0 0 0 3px rgb(14 165 233 / 0.15); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon: typeof User;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Icon size={16} className="text-sky-400" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
        active
          ? 'border-sky-500 bg-sky-500/15 text-sky-300'
          : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600'
      }`}
    >
      {children}
    </button>
  );
}
