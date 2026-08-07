const API_BASE = 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(payload?.detail || payload?.error || text || 'Request failed');
  }

  return (payload ?? {}) as T;
}

export async function createProfile(payload: Record<string, unknown>) {
  return request<{ id: number }>('/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProfile(id: string) {
  return request<Record<string, unknown> | null>(`/profiles/${id}`);
}

export async function getQuestions() {
  return request<Record<string, unknown>[]>('/questions');
}

export async function getQuestionsByDomain(domain: string) {
  return request<Record<string, unknown>[]>(`/questions/domain/${encodeURIComponent(domain)}`);
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
  return request<Record<string, unknown> | null>(`/user-stats/${profileId}`);
}

export async function saveUserStats(payload: Record<string, unknown>) {
  return request('/user-stats/' + encodeURIComponent(String(payload.profile_id ?? '')), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
