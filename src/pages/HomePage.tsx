import { Brain, Code2, Network, Database, Globe, ShieldCheck, ArrowRight, Trophy, Flame, CalendarCheck, Sparkles } from 'lucide-react';
import type { Page } from '@/components/Navbar';
import { DOMAINS } from '@/lib/supabase';

const ICONS: Record<string, typeof Code2> = {
  Code2, Network, Database, Globe, ShieldCheck,
};

interface Props {
  onNavigate: (p: Page) => void;
  hasProfile: boolean;
}

export function HomePage({ onNavigate, hasProfile }: Props) {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative pt-32 pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-sky-500/20 blur-[120px]" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute left-10 top-60 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-5xl px-5 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
            <Sparkles size={14} />
            5 IT Domains · 50+ Questions · 20 Daily
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl md:text-7xl">
            Master IT with a
            <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Daily Quiz Habit
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Test your knowledge across Programming, Networking, Databases, Web Development, and Cybersecurity.
            Build streaks, earn marks, and track your progress — every single day.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => onNavigate(hasProfile ? 'domains' : 'apply')}
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40 hover:-translate-y-0.5"
            >
              {hasProfile ? 'Start Quiz' : 'Get Started'}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => onNavigate('about')}
              className="rounded-xl border border-slate-700 bg-slate-900/50 px-7 py-3.5 text-base font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: Flame, title: 'Daily Streaks', desc: 'Answer questions every day to keep your streak alive and growing.', color: 'text-orange-400 bg-orange-500/10' },
            { icon: Trophy, title: 'Total Marks', desc: 'Earn 5 marks per correct answer and climb your personal scoreboard.', color: 'text-amber-400 bg-amber-500/10' },
            { icon: CalendarCheck, title: '20 Per Day', desc: 'Fresh, non-repeating questions each day — never the same twice.', color: 'text-emerald-400 bg-emerald-500/10' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/70 hover:-translate-y-1"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.color}`}>
                  <Icon size={24} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Domains */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white">Choose Your Domain</h2>
          <p className="mt-2 text-slate-400">Five core IT areas to test and grow your expertise.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => {
            const Icon = ICONS[d.icon] ?? Brain;
            return (
              <button
                key={d.name}
                onClick={() => onNavigate(hasProfile ? 'domains' : 'apply')}
                className="group flex flex-col items-start rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/60 to-slate-900/20 p-6 text-left transition-all hover:border-sky-500/40 hover:from-slate-900 hover:to-slate-900/40 hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-all group-hover:bg-sky-500/20 group-hover:scale-110">
                  <Icon size={24} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-white">{d.name}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{d.description}</p>
                <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-sky-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Explore <ArrowRight size={14} />
                </span>
              </button>
            );
          })}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center">
            <Brain className="mb-3 text-slate-600" size={32} />
            <p className="text-sm text-slate-500">More domains coming soon</p>
          </div>
        </div>
      </section>
    </div>
  );
}
