import { useEffect, useState } from 'react';
import { Brain, Home, Info, ClipboardList, LayoutGrid, BarChart3, Menu, X } from 'lucide-react';

export type Page = 'home' | 'about' | 'apply' | 'domains' | 'quiz' | 'status';

interface NavProps {
  page: Page;
  onNavigate: (p: Page) => void;
  hasProfile: boolean;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'about', label: 'About', icon: Info },
  { id: 'apply', label: 'Apply', icon: ClipboardList },
  { id: 'domains', label: 'Domains', icon: LayoutGrid },
  { id: 'status', label: 'Status', icon: BarChart3 },
];

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30"
      style={{ width: size, height: size }}
    >
      <Brain className="text-white" style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={2.2} />
      <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400"></span>
      </span>
    </div>
  );
}

export function Navbar({ page, onNavigate, hasProfile }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (p: Page) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/85 backdrop-blur-md border-b border-slate-800' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <button onClick={() => go('home')} className="flex items-center gap-2.5 group">
          <Logo size={38} />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-white">QuizIT</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-sky-400">Daily Tech Quiz</span>
          </div>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-sky-500/15 text-sky-300'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon size={16} strokeWidth={2.2} />
                {item.label}
              </button>
            );
          })}
          {hasProfile && (
            <span className="ml-2 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Profile Active
            </span>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-200 hover:bg-slate-800 md:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-800 bg-slate-950/95 px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
