import { useEffect, useState } from 'react';
import { Code2, Network, Database, Globe, ShieldCheck, ArrowRight, Loader2, Lock, Brain } from 'lucide-react';
import type { Page } from '@/components/Navbar';
import { DOMAINS, getProfileId, type Profile } from '@/lib/supabase';
import { getProfile, getQuestions } from '@/lib/db';
import { setQuizDomain } from '@/lib/quizDomain';

const ICONS: Record<string, typeof Code2> = {
  Code2, Network, Database, Globe, ShieldCheck,
};

interface Props {
  profileId: string | null;
  onStartQuiz: () => void;
  onNavigate: (p: Page) => void;
}

export function DomainsPage({ profileId, onStartQuiz, onNavigate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = getProfileId();
    if (!pid) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const prof = await getProfile(pid);
        setProfile(prof as Profile | null);
        if ((prof as Profile | null)?.domain_interest) setSelected((prof as Profile | null)?.domain_interest ?? null);

        const qs = await getQuestions();
        const tally: Record<string, number> = {};
        (qs ?? []).forEach((q) => {
          const domain = q.domain;
          tally[domain] = (tally[domain] ?? 0) + 1;
        });
        setCounts(tally);
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <Loader2 size={28} className="animate-spin text-sky-400" />
      </div>
    );
  }

  if (!profileId || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pt-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
          <Lock size={30} className="text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">No profile yet</h2>
        <p className="mt-2 max-w-sm text-slate-400">Fill out the application form first to unlock the quiz domains.</p>
        <button
          onClick={() => onNavigate('apply')}
          className="mt-6 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/30"
        >
          Go to Application
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pt-28 pb-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
            <Brain size={14} /> Choose a Domain
          </span>
          <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
            Welcome back, <span className="text-sky-400">{profile.name.split(' ')[0]}</span>
          </h1>
          <p className="mt-3 text-slate-400">Pick a domain to start today's quiz. You get 20 fresh questions per day.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => {
            const Icon = ICONS[d.icon] ?? Code2;
            const isInterest = profile.domain_interest === d.name;
            const isSelected = selected === d.name;
            const qCount = counts[d.name] ?? 0;
            return (
              <button
                key={d.name}
                onClick={() => setSelected(d.name)}
                className={`group relative flex flex-col items-start rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {isInterest && (
                  <span className="absolute right-4 top-4 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/20">
                    Your Pick
                  </span>
                )}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                  isSelected ? 'bg-sky-500/20 text-sky-300 scale-110' : 'bg-sky-500/10 text-sky-400 group-hover:scale-110'
                }`}>
                  <Icon size={24} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-white">{d.name}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{d.description}</p>
                <p className="mt-4 text-xs font-medium text-slate-500">{qCount} questions available</p>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm text-slate-400">Selected domain</p>
              <p className="text-xl font-bold text-white">{selected}</p>
            </div>
            <button
              onClick={() => {
                if (selected) {
                  setQuizDomain(selected);
                  onStartQuiz();
                }
              }}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5"
            >
              Start Quiz
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
