import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, Trophy, ArrowRight, RotateCcw, Lock, Clock, Zap, Timer } from 'lucide-react';
import type { Page } from '@/components/Navbar';
import {
  getProfileId,
  DAILY_LIMIT,
  MARKS_PER_CORRECT,
  calcBonus,
  formatMs,
  recordTiming,
  clearSessionTimes,
  getSessionTimes,
  type Question,
  type QuizAttempt,
} from '@/lib/supabase';
import { getQuestionsByDomain, saveAttempt, saveDailyProgress, saveUserStats, getUserStats } from '@/lib/db';

const DOMAIN_KEY = 'quiz_selected_domain';

export function setQuizDomain(domain: string) {
  localStorage.setItem(DOMAIN_KEY, domain);
}

function getQuizDomain(): string | null {
  return localStorage.getItem(DOMAIN_KEY);
}

interface Props {
  profileId: string | null;
  onNavigate: (p: Page) => void;
}

type Phase = 'loading' | 'locked' | 'no-profile' | 'playing' | 'done';

export function QuizPage({ profileId, onNavigate }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [domain, setDomain] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, marks: 0, bonus: 0 });
  const [answeredToday, setAnsweredToday] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastTimeMs, setLastTimeMs] = useState(0);
  const [lastBonus, setLastBonus] = useState(0);

  const questionStartRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  // Live timer
  useEffect(() => {
    if (phase === 'playing' && !showFeedback) {
      questionStartRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - questionStartRef.current);
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, showFeedback, currentIdx]);

  const recordAnswer = useCallback(async (question: Question, answer: string, isCorrect: boolean, timeMs: number, bonus: number) => {
    const pid = getProfileId();
    if (!pid) return;

    try {
      await saveAttempt({
        profile_id: pid,
        question_id: question.id,
        selected_answer: answer,
        is_correct: isCorrect,
        time_taken_ms: Math.round(timeMs),
      });

      const totalMarksForQ = (isCorrect ? MARKS_PER_CORRECT : 0) + bonus;

      // Upsert daily progress
      const roundedTime = Math.round(timeMs);
      await saveDailyProgress({
        profile_id: pid,
        date: todayStr,
        questions_answered: 1,
        correct_count: isCorrect ? 1 : 0,
        marks: totalMarksForQ,
        total_time_ms: roundedTime,
      });

      // Update user_stats (streak + totals)
      const stats = await getUserStats(pid);

      const newTotalAnswered = (Number((stats as Record<string, unknown> | null)?.total_answered ?? 0)) + 1;
      const newTotalCorrect = (Number((stats as Record<string, unknown> | null)?.total_correct ?? 0)) + (isCorrect ? 1 : 0);
      const newTotalMarks = (Number((stats as Record<string, unknown> | null)?.total_marks ?? 0)) + totalMarksForQ;

      let newStreak = 1;
      let longestStreak = 1;
      if (stats) {
        const lastDate = String((stats as Record<string, unknown>).last_active_date ?? '');
        if (lastDate) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().split('T')[0];
          if (lastDate === yStr) {
            newStreak = Number((stats as Record<string, unknown>).current_streak ?? 0) + 1;
          } else if (lastDate === todayStr) {
            newStreak = Number((stats as Record<string, unknown>).current_streak ?? 0);
          } else {
            newStreak = 1;
          }
        }
        longestStreak = Math.max(Number((stats as Record<string, unknown>).longest_streak ?? 0), newStreak);
      }

      const newTotalTime = (Number((stats as Record<string, unknown> | null)?.total_time_ms ?? 0)) + Math.round(timeMs);
      let newFastest = (stats as Record<string, unknown> | null)?.fastest_correct_ms ?? null;
      if (isCorrect) {
        if (newFastest === null || timeMs < newFastest) {
          newFastest = Math.round(timeMs);
        }
      }

      await saveUserStats({
        profile_id: pid,
        total_answered: newTotalAnswered,
        total_correct: newTotalCorrect,
        total_marks: newTotalMarks,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_active_date: todayStr,
        updated_at: new Date().toISOString(),
        total_time_ms: newTotalTime,
        fastest_correct_ms: newFastest,
      });
    } catch (err) {
      console.error('Failed to record answer:', err);
    }
  }, [todayStr]);

  useEffect(() => {
    const pid = getProfileId();
    const dom = getQuizDomain();
    if (!pid) {
      setPhase('no-profile');
      return;
    }
    if (!dom) {
      onNavigate('domains');
      return;
    }
    setDomain(dom);
    clearSessionTimes();

    void (async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayCount = 0;
        setAnsweredToday(todayCount);

        if (todayCount >= DAILY_LIMIT) {
          setPhase('locked');
          return;
        }

        const allQs = await getQuestionsByDomain(dom);

        const remaining = (allQs ?? []).filter((q: Record<string, unknown>) => true);
        const shuffled = [...remaining].sort(() => Math.random() - 0.5);
        const available = Math.min(DAILY_LIMIT - todayCount, shuffled.length);

        if (available === 0) {
          setPhase('locked');
          return;
        }

        setQuestions(shuffled.slice(0, available));
        setPhase('playing');
      } catch (err) {
        console.error('Quiz load error:', err);
        setError('Failed to load quiz. Please try again.');
        setPhase('no-profile');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const handleAnswer = (answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  };

  const handleNext = async () => {
    const q = questions[currentIdx];
    if (!q || !selectedAnswer) return;

    const timeMs = Date.now() - questionStartRef.current;
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = selectedAnswer === q.correct_answer;
    const bonus = calcBonus(timeMs, isCorrect);
    const totalMarksForQ = (isCorrect ? MARKS_PER_CORRECT : 0) + bonus;

    setShowFeedback(true);
    setLastTimeMs(timeMs);
    setLastBonus(bonus);

    recordTiming(timeMs, isCorrect);
    await recordAnswer(q, selectedAnswer, isCorrect, timeMs, bonus);

    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
      marks: s.marks + totalMarksForQ,
      bonus: s.bonus + bonus,
    }));

    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) {
        setPhase('done');
      } else {
        setCurrentIdx((i) => i + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1400);
  };

  // --- Render phases ---

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <Loader2 size={28} className="animate-spin text-sky-400" />
      </div>
    );
  }

  if (phase === 'no-profile') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pt-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
          <Lock size={30} className="text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">No profile found</h2>
        <p className="mt-2 max-w-sm text-slate-400">{error ?? 'Please fill out the application form to start the quiz.'}</p>
        <button onClick={() => onNavigate('apply')} className="mt-6 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white">
          Go to Application
        </button>
      </div>
    );
  }

  if (phase === 'locked') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 pt-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 size={30} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Daily Limit Reached!</h2>
        <p className="mt-2 max-w-sm text-slate-400">
          You've answered all {DAILY_LIMIT} questions for today. Come back tomorrow for {DAILY_LIMIT} fresh questions.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => onNavigate('status')} className="rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white">
            View Status
          </button>
          <button onClick={() => onNavigate('home')} className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 font-semibold text-slate-200">
            Back Home
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const avgTime = score.total > 0
      ? Math.round(getSessionTimes().reduce((a, b) => a + b, 0) / score.total)
      : 0;
    const fastest = getSessionTimes().length > 0 ? Math.min(...getSessionTimes()) : 0;

    return (
      <div className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-lg px-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
              <Trophy size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">Quiz Complete!</h2>
            <p className="mt-2 text-slate-400">{domain} · {score.total} questions</p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label="Correct" value={`${score.correct}/${score.total}`} color="text-emerald-400" />
              <StatCard label="Marks" value={`+${score.marks}`} color="text-sky-400" />
              <StatCard label="Accuracy" value={`${accuracy}%`} color="text-amber-400" />
              <StatCard label="Avg Time" value={formatMs(avgTime)} color="text-violet-400" />
              <StatCard label="Fastest" value={formatMs(fastest)} color="text-cyan-400" />
              <StatCard label="Speed Bonus" value={`+${score.bonus}`} color="text-orange-400" />
            </div>

            {score.bonus > 0 && (
              <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300">
                <Zap size={16} /> You earned {score.bonus} bonus marks for fast & correct answers!
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => onNavigate('status')}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/30"
              >
                View Full Status <ArrowRight size={18} />
              </button>
              <button
                onClick={() => onNavigate('domains')}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 font-semibold text-slate-200"
              >
                <RotateCcw size={18} /> Try Another Domain
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing phase ---
  const q = questions[currentIdx];
  if (!q) return null;

  const progress = ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100;
  const options: { key: string; text: string }[] = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ];

  // Timer color: green <10s, amber <20s, red >20s
  const timerColor = elapsedMs < 10000 ? 'text-emerald-400' : elapsedMs < 20000 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="relative overflow-hidden pt-24 pb-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-2xl px-5">
        {/* Progress bar + timer */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-sky-300">{domain}</span>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 font-mono font-bold ${timerColor}`}>
                <Timer size={15} className={timerColor} />
                <span>{formatMs(elapsedMs)}</span>
              </span>
              <span className="text-slate-400">
                Q{currentIdx + 1}/{questions.length}
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 text-right text-xs text-slate-500">
            {answeredToday + currentIdx + (showFeedback ? 1 : 0)}/{DAILY_LIMIT} today
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sm font-bold text-sky-300">
              {currentIdx + 1}
            </span>
            <h2 className="text-lg font-semibold leading-relaxed text-white sm:text-xl">{q.question}</h2>
          </div>

          <div className="space-y-3">
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrectOpt = opt.key === q.correct_answer;
              let cls = 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60';
              let iconEl: React.ReactNode = (
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-400">
                  {opt.key}
                </span>
              );

              if (showFeedback) {
                if (isCorrectOpt) {
                  cls = 'border-emerald-500 bg-emerald-500/10';
                  iconEl = <CheckCircle2 size={22} className="text-emerald-400" />;
                } else if (isSelected && !isCorrectOpt) {
                  cls = 'border-red-500 bg-red-500/10';
                  iconEl = <XCircle size={22} className="text-red-400" />;
                } else {
                  cls = 'border-slate-800 bg-slate-900/30 opacity-50';
                }
              } else if (isSelected) {
                cls = 'border-sky-500 bg-sky-500/10';
                iconEl = (
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500 text-xs font-bold text-white">
                    {opt.key}
                  </span>
                );
              }

              return (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={showFeedback}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${cls} ${
                    !showFeedback ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {iconEl}
                  <span className={`text-sm font-medium ${showFeedback && isCorrectOpt ? 'text-emerald-200' : showFeedback && isSelected && !isCorrectOpt ? 'text-red-200' : 'text-slate-200'}`}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="mt-5 space-y-2">
              <div className={`rounded-xl border p-4 text-sm font-medium ${
                selectedAnswer === q.correct_answer
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}>
                {selectedAnswer === q.correct_answer
                  ? `Correct! +${MARKS_PER_CORRECT} marks${lastBonus > 0 ? ` + ${lastBonus} speed bonus` : ''}`
                  : `Wrong! The correct answer is ${q.correct_answer}.`}
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Answered in {formatMs(lastTimeMs)}
                </span>
                {lastBonus > 0 && (
                  <span className="flex items-center gap-1 text-orange-400">
                    <Zap size={12} /> Speed bonus +{lastBonus}
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={!selectedAnswer || showFeedback}
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {currentIdx + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Live score */}
        <div className="mt-5 flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 size={16} /> {score.correct} correct
          </span>
          <span className="flex items-center gap-1.5 text-sky-400">
            <Trophy size={16} /> {score.marks} marks
          </span>
          {score.bonus > 0 && (
            <span className="flex items-center gap-1.5 text-orange-400">
              <Zap size={16} /> +{score.bonus} bonus
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
