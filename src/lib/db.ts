import type { DailyProgress, Profile, Question, UserStats } from '@/lib/supabase';

const DEFAULT_DEV_API_BASE = 'http://localhost:3001';

function getApiBase(): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) return configuredBase.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }

  return DEFAULT_DEV_API_BASE;
}

const API_BASE = getApiBase();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to reach the server.';
    throw new Error(`Unable to reach the API server at ${API_BASE}. ${message}`);
  }

  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message = getErrorMessage(payload) || text || 'Request failed';
    throw new Error(message);
  }

  return (payload ?? {}) as T;
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  return typeof record.detail === 'string'
    ? record.detail
    : typeof record.error === 'string'
      ? record.error
      : null;
}

export async function createProfile(payload: Record<string, unknown>) {
  return request<{ id: number }>('/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: Record<string, unknown>) {
  return request<{ id: number }>('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProfile(id: string) {
  return request<Profile | null>(`/profiles/${id}`);
}

export async function getQuestions() {
  return request<Question[]>('/questions');
}

export async function getQuestionsByDomain(domain: string) {
  return request<Question[]>(`/questions/domain/${encodeURIComponent(domain)}`);
}

export async function getFreshQuestionsByDomain(domain: string, profileId: string, date: string, limit: number) {
  const params = new URLSearchParams({
    profileId,
    date,
    limit: String(limit),
  });

  return request<Question[]>(`/questions/domain/${encodeURIComponent(domain)}/fresh?${params.toString()}`);
}

export async function saveAttempt(payload: Record<string, unknown>) {
  return request('/quiz-attempts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveDailyProgress(payload: Record<string, unknown>) {
  return request('/daily-progress', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUserStats(profileId: string) {
  return request<UserStats | null>(`/user-stats/${profileId}`);
}

export async function getDailyProgress(profileId: string) {
  return request<DailyProgress[]>(`/daily-progress/${profileId}`);
}

export async function saveUserStats(payload: Record<string, unknown>) {
  return request('/user-stats/' + encodeURIComponent(String(payload.profile_id ?? '')), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
