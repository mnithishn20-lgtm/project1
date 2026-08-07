import { useEffect, useState } from 'react';
import { Trophy, Flame, Target, TrendingUp, Loader2, Lock, Calendar, Award, Zap, BarChart3, Timer, Gauge } from 'lucide-react';
import type { Page } from '@/components/Navbar';
import { getProfileId, formatMs, DAILY_LIMIT, MARKS_PER_CORRECT, type Profile, type UserStats, type DailyProgress } from '@/lib/supabase';
import { getProfile, getUserStats } from '@/lib/db';

interface Props {
  profileId: string | null;
  onNavigate: (p: Page) => void;
}

export function StatusPage({ profileId, onNavigate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [daily, setDaily] = useState<DailyProgress[]>([]);
  const [todayCount, setTodayCount] = useState(0);
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

        const st = await getUserStats(pid);
        setStats(st as UserStats | null);

        setDaily([]);
        setTodayCount(0);
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
        <p className="mt-2 max-w-sm text-slate-400">Fill out the application form to start tracking your quiz progress.</p>
        <button onClick={() => onNavigate('apply')} className="mt-6 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white">
          Go to Application
        </button>
      </div>
    );
  }

  const totalAnswered = stats?.total_answered ?? 0;
  const totalCorrect = stats?.total_correct ?? 0;
  const totalMarks = stats?.total_marks ?? 0;
  const currentStreak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const remainingToday = Math.max(0, DAILY_LIMIT - todayCount);

  // Last 7 days for the mini chart
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const entry = daily.find((dp) => dp.date === dStr);
    return {
      date: dStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: entry?.questions_answered ?? 0,
      marks: entry?.marks ?? 0,
    };
  });
  const maxCount = Math.max(...last7.map((d) => d.count), 1);

  return (
    <div className="relative overflow-hidden pt-28 pb-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-5">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300">
            <BarChart3 size={14} /> Your Status
          </span>
          <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
            Hey <span className="text-sky-400">{profile.name.split(' ')[0]}</span>, here's your progress
          </h1>
          <p className="mt-3 text-slate-400">Track your marks, streaks, and daily quiz activity.</p>
        </div>

        {/* Today's progress banner */}
        <div className="mt-10 rounded-2xl border border-slate-800 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Today's Quiz</p>
                <p className="text-2xl font-bold text-white">
                  {todayCount} / {DAILY_LIMIT} answered
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-slate-400">Remaining today</p>
                <p className="text-xl font-bold text-sky-400">{remainingToday} questions</p>
              </div>
              {remainingToday > 0 ? (
                <button
                  onClick={() => onNavigate('domains')}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30"
                >
                  Continue
                </button>
              ) : (
                <span className="rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300">
                  Done for today!
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700"
              style={{ width: `${(todayCount / DAILY_LIMIT) * 100}%` }}
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Trophy} label="Total Marks" value={totalMarks} color="text-amber-400" bg="bg-amber-500/10" />
          <StatCard icon={Flame} label="Current Streak" value={`${currentStreak} day${currentStreak === 1 ? '' : 's'}`} color="text-orange-400" bg="bg-orange-500/10" />
          <StatCard icon={Award} label="Longest Streak" value={`${longestStreak} day${longestStreak === 1 ? '' : 's'}`} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard icon={Target} label="Accuracy" value={`${accuracy}%`} color="text-sky-400" bg="bg-sky-500/10" />
          <StatCard icon={Timer} label="Avg Time/Q" value={totalAnswered > 0 ? formatMs(Math.round((stats?.total_time_ms ?? 0) / totalAnswered)) : '—'} color="text-violet-400" bg="bg-violet-500/10" />
          <StatCard icon={Gauge} label="Fastest Correct" value={stats?.fastest_correct_ms !== null && stats?.fastest_correct_ms !== undefined ? formatMs(stats.fastest_correct_ms) : '—'} color="text-cyan-400" bg="bg-cyan-500/10" />
        </div>

        {/* Two-column: chart + breakdown */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Weekly chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp size={18} className="text-sky-400" />
              <h3 className="font-bold text-white">Last 7 Days Activity</h3>
            </div>
            <div className="flex h-48 items-end justify-between gap-2">
              {last7.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 to-cyan-400 transition-all duration-700 hover:from-sky-500 hover:to-cyan-300"
                      style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '8px' : '2px' }}
                      title={`${d.count} questions · ${d.marks} marks`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{d.label}</span>
                  <span className="text-xs font-bold text-slate-300">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-5 flex items-center gap-2">
              <Calendar size={18} className="text-sky-400" />
              <h3 className="font-bold text-white">All-Time Summary</h3>
            </div>
            <div className="space-y-4">
              <Row label="Questions Answered" value={totalAnswered} />
              <Row label="Correct Answers" value={totalCorrect} accent="text-emerald-400" />
              <Row label="Wrong Answers" value={totalAnswered - totalCorrect} accent="text-red-400" />
              <div className="border-t border-slate-800 pt-4">
                <Row label="Marks per correct" value={MARKS_PER_CORRECT} accent="text-sky-400" />
              </div>
              <div className="border-t border-slate-800 pt-4">
                <Row label="Daily limit" value={DAILY_LIMIT} accent="text-amber-400" />
              </div>
              <div className="border-t border-slate-800 pt-4">
                <Row label="Total Time Spent" value={formatMs(stats?.total_time_ms ?? 0)} accent="text-violet-400" />
                <Row label="Fastest Correct" value={stats?.fastest_correct_ms !== null && stats?.fastest_correct_ms !== undefined ? formatMs(stats.fastest_correct_ms) : '—'} accent="text-cyan-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent days table */}
        {daily.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="mb-4 font-bold text-white">Recent Days</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-semibold">Date</th>
                    <th className="pb-3 pr-4 font-semibold">Questions</th>
                    <th className="pb-3 pr-4 font-semibold">Correct</th>
                    <th className="pb-3 pr-4 font-semibold">Marks</th>
                    <th className="pb-3 pr-4 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.slice(0, 7).map((dp) => {
                    const acc = dp.questions_answered > 0 ? Math.round((dp.correct_count / dp.questions_answered) * 100) : 0;
                    return (
                      <tr key={dp.id} className="border-b border-slate-800/50 last:border-0">
                        <td className="py-3 pr-4 text-slate-300">
                          {new Date(dp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{dp.questions_answered}</td>
                        <td className="py-3 pr-4 text-emerald-400">{dp.correct_count}</td>
                        <td className="py-3 pr-4 text-sky-400 font-semibold">{dp.marks}</td>
                        <td className="py-3 pr-4 text-violet-400">{dp.total_time_ms ? formatMs(dp.total_time_ms) : '—'}</td>
                        <td className="py-3 text-slate-300">{acc}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-slate-700 hover:-translate-y-1">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${bg} ${color}`}>
        <Icon size={22} />
      </div>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-bold ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
