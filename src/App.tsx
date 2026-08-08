import { useEffect, useState } from 'react';
import { Navbar, type Page } from '@/components/Navbar';
import { getProfileId } from '@/lib/supabase';
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { ApplyPage } from '@/pages/ApplyPage';
import { DomainsPage } from '@/pages/DomainsPage';
import { LoginPage } from '@/pages/LoginPage';
import { QuizPage } from '@/pages/QuizPage';
import { StatusPage } from '@/pages/StatusPage';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [profileId, setProfileId] = useState<string | null>(getProfileId());

  useEffect(() => {
    const onStorage = () => setProfileId(getProfileId());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const navigate = (p: Page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(p);
    setProfileId(getProfileId());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <Navbar page={page} onNavigate={navigate} hasProfile={!!profileId} />
      <main>
        {page === 'home' && <HomePage onNavigate={navigate} hasProfile={!!profileId} />}
        {page === 'about' && <AboutPage onNavigate={navigate} />}
        {page === 'apply' && <ApplyPage onApplied={() => navigate('domains')} />}
        {page === 'login' && <LoginPage onLoggedIn={() => navigate('domains')} />}
        {page === 'domains' && (
          <DomainsPage profileId={profileId} onStartQuiz={() => navigate('quiz')} onNavigate={navigate} />
        )}
        {page === 'quiz' && <QuizPage profileId={profileId} onNavigate={navigate} />}
        {page === 'status' && <StatusPage profileId={profileId} onNavigate={navigate} />}
      </main>
      <footer className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="mx-auto max-w-7xl px-5 text-center text-sm text-slate-500">
          <p>QuizIT — Sharpen your IT knowledge, one question at a time.</p>
        </div>
      </footer>
    </div>
  );
}
