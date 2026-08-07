import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars missing. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Domain = 'Programming' | 'Networking' | 'Databases' | 'Web Development' | 'Cybersecurity';

export const DOMAINS: { name: Domain; description: string; icon: string }[] = [
  { name: 'Programming', description: 'Languages, paradigms, data structures & algorithms', icon: 'Code2' },
  { name: 'Networking', description: 'Protocols, OSI model, IP addressing & routing', icon: 'Network' },
  { name: 'Databases', description: 'SQL, normalization, joins & NoSQL concepts', icon: 'Database' },
  { name: 'Web Development', description: 'HTML, CSS, JavaScript, React & web APIs', icon: 'Globe' },
  { name: 'Cybersecurity', description: 'Attacks, encryption, authentication & defense', icon: 'ShieldCheck' },
];

export const DAILY_LIMIT = 20;
export const MARKS_PER_CORRECT = 5;
export const FAST_BONUS_THRESHOLD_MS = 10_000; // under 10s
export const MEDIUM_BONUS_THRESHOLD_MS = 20_000; // under 20s
export const FAST_BONUS = 3;
export const MEDIUM_BONUS = 1;

export function calcBonus(timeMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  if (timeMs < FAST_BONUS_THRESHOLD_MS) return FAST_BONUS;
  if (timeMs < MEDIUM_BONUS_THRESHOLD_MS) return MEDIUM_BONUS;
  return 0;
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  education: string | null;
  experience: string | null;
  domain_interest: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  domain: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  profile_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  attempted_at: string;
  time_taken_ms: number | null;
}

export interface DailyProgress {
  id: string;
  profile_id: string;
  date: string;
  questions_answered: number;
  correct_count: number;
  marks: number;
  total_time_ms: number | null;
}

export interface UserStats {
  profile_id: string;
  total_marks: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_answered: number;
  total_correct: number;
  updated_at: string;
  total_time_ms: number | null;
  fastest_correct_ms: number | null;
}

const PROFILE_KEY = 'quiz_profile_id';

export function getProfileId(): string | null {
  return localStorage.getItem(PROFILE_KEY);
}

export function setProfileId(id: string) {
  localStorage.setItem(PROFILE_KEY, id);
}

export function clearProfileId() {
  localStorage.removeItem(PROFILE_KEY);
}

// --- Local timing store (persists across sessions) ---
const TIMING_KEY = 'quiz_timing';

interface TimingRecord {
  totalTimeMs: number;
  fastestCorrectMs: number | null;
  sessionTimes: number[]; // times for the current quiz session
}

function loadTiming(): TimingRecord {
  try {
    const raw = localStorage.getItem(TIMING_KEY);
    if (raw) return JSON.parse(raw) as TimingRecord;
  } catch { /* ignore */ }
  return { totalTimeMs: 0, fastestCorrectMs: null, sessionTimes: [] };
}

function saveTiming(t: TimingRecord) {
  localStorage.setItem(TIMING_KEY, JSON.stringify(t));
}

export function getTiming(): TimingRecord {
  return loadTiming();
}

export function recordTiming(timeMs: number, isCorrect: boolean) {
  const t = loadTiming();
  t.totalTimeMs += timeMs;
  t.sessionTimes.push(timeMs);
  if (isCorrect) {
    if (t.fastestCorrectMs === null || timeMs < t.fastestCorrectMs) {
      t.fastestCorrectMs = timeMs;
    }
  }
  saveTiming(t);
}

export function clearSessionTimes() {
  const t = loadTiming();
  t.sessionTimes = [];
  saveTiming(t);
}

export function getSessionTimes(): number[] {
  return loadTiming().sessionTimes;
}
