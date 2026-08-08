import { Target, Layers, Flame, Trophy, CalendarCheck, ShieldCheck, Rocket, BookOpen, ArrowRight } from 'lucide-react';
import type { Page } from '@/components/Navbar';

interface Props {
  onNavigate: (p: Page) => void;
}

export function AboutPage({ onNavigate }: Props) {
  return (
    <div className="relative overflow-hidden pt-28 pb-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl px-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
            <BookOpen size={14} /> About QuizIT
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Built for learners who want to
            <span className="block bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">level up daily</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            QuizIT is a focused daily quiz platform that helps you strengthen your IT knowledge
            across five core domains — one question at a time, one day at a time.
          </p>
        </div>

        {/* Mission */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Target size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Our Mission</h2>
              <p className="mt-2 text-slate-400">
                We believe consistent, bite-sized practice beats cramming. By giving you 20 fresh,
                non-repeating questions to complete each day, QuizIT turns learning into a habit you actually enjoy.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-10">
          <h2 className="mb-6 text-2xl font-bold text-white">How It Works</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { icon: Layers, step: '1', title: 'Fill the Application Form', desc: 'Tell us a bit about yourself — your education, experience, and the IT domain that interests you most.' },
              { icon: BookOpen, step: '2', title: 'Pick a Domain', desc: 'Choose from Programming, Networking, Databases, Web Development, or Cybersecurity.' },
              { icon: CalendarCheck, step: '3', title: 'Complete 20 Questions Daily', desc: 'Finish 20 fresh questions in one day. They never repeat the same day, so every session is new.' },
              { icon: Trophy, step: '4', title: 'Track Your Progress', desc: 'Watch your total marks, accuracy, and streak grow on your status dashboard.' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sm font-bold text-sky-400">
                    {s.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon size={18} className="text-sky-400" />
                      <h3 className="font-bold text-white">{s.title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-400">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Flame, title: 'Streak Tracking', desc: 'Keep your streak alive by answering daily.' },
            { icon: ShieldCheck, title: 'Non-Repeating Qs', desc: 'No question repeats within a single day.' },
            { icon: Rocket, title: 'Real IT Topics', desc: 'Questions crafted around real-world IT skills.' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to start your quiz journey?</h2>
          <p className="mt-2 text-slate-400">Fill the application form and pick your first domain today.</p>
          <button
            onClick={() => onNavigate('apply')}
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5"
          >
            Apply Now
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
