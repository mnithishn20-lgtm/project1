const DOMAIN_KEY = 'quiz_selected_domain';

export function setQuizDomain(domain: string) {
  localStorage.setItem(DOMAIN_KEY, domain);
}

export function getQuizDomain(): string | null {
  return localStorage.getItem(DOMAIN_KEY);
}
