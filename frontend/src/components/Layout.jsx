import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  DashboardIcon,
  ScreeningIcon,
  HistoryIcon, 
  ReportIcon
} from './Icons';
import { checkHealth } from '../api/client';

export default function Layout({ children }) {
  const location = useLocation();
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    let isMounted = true;
    checkHealth()
      .then((res) => {
        if (isMounted) setBackendOnline(res?.status === 'ok');
      })
      .catch(() => {
        if (isMounted) setBackendOnline(false);
      });
    return () => { isMounted = false; };
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', shortName: 'Dashboard', path: '/', icon: DashboardIcon, label: 'Overview' },
    { name: 'New Screening', shortName: 'Screen', path: '/screening', icon: ScreeningIcon, label: 'Breathing Check' },
    { name: 'Screening History', shortName: 'History', path: '/history', icon: HistoryIcon, label: 'Past Records' },
    { name: 'Results / Reports', shortName: 'Results', path: '/results', icon: ReportIcon, label: 'Latest Report' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-ink-primary flex flex-col md:flex-row font-sans selection:bg-breath-sky selection:text-ink-primary antialiased">
      {/* DESKTOP SIDEBAR (Visible on md and larger screens) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/80 sticky top-0 h-screen z-30 shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)] print:hidden">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-breath-teal text-white flex items-center justify-center text-lg shadow-sm font-bold">
            🫁
          </div>
          <div>
            <h1 className="font-sora text-base font-bold tracking-tight text-ink-primary leading-tight">
              RespiraScreen
            </h1>
            <p className="text-[11px] text-ink-muted font-medium">Respiratory Decision Support</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = 
              item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-150 ${
                  isActive
                    ? 'bg-breath-sky-light text-breath-teal font-semibold shadow-2xs'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50 font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-white text-breath-teal shadow-2xs' : 'text-ink-muted'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-snug truncate">{item.name}</div>
                  <div className="text-[10px] text-ink-muted font-normal">{item.label}</div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop Footer Health Status */}
        <div className="p-4 border-t border-slate-100 bg-canvas/40">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60 text-xs shadow-2xs">
            <div className="flex items-center gap-2 font-medium text-ink-secondary">
              <span 
                className={`w-2 h-2 rounded-full ${
                  backendOnline === true 
                    ? 'bg-breath-teal' 
                    : backendOnline === false 
                    ? 'bg-signal-coral' 
                    : 'bg-caution-amber animate-pulse'
                }`} 
              />
              <span>System</span>
            </div>
            <span className={`text-[11px] font-medium ${backendOnline === true ? 'text-breath-teal font-semibold' : backendOnline === false ? 'text-signal-coral' : 'text-caution-amber'}`}>
              {backendOnline === true ? 'Online (:8000)' : backendOnline === false ? 'Offline' : 'Connecting...'}
            </span>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP HEADER (Visible on screens smaller than md) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#F6F8F7]/90 backdrop-blur-md border-b border-slate-200/60 transition-all print:hidden">
        <div className="w-full max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-breath-teal text-white flex items-center justify-center text-sm shadow-xs font-bold">
              🫁
            </div>
            <div>
              <span className="font-sora text-sm font-semibold tracking-tight text-ink-primary">
                RespiraScreen
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-slate-200/60 text-[11px] text-ink-secondary"
              title={backendOnline === true ? "System ready" : backendOnline === false ? "System offline" : "Connecting"}
            >
              <span 
                className={`w-1.5 h-1.5 rounded-full ${
                  backendOnline === true 
                    ? 'bg-breath-teal' 
                    : backendOnline === false 
                    ? 'bg-signal-coral' 
                    : 'bg-caution-amber animate-pulse'
                }`} 
              />
              <span className="text-[10px] font-medium">
                {backendOnline === true ? 'Ready' : backendOnline === false ? 'Offline' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER (Responsive width, spacious bottom clearance for mobile navigation) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen print:min-h-0 print:p-0 overflow-x-hidden">
        <main className="flex-1 w-full max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto px-3.5 sm:px-6 md:px-8 lg:px-12 pt-3 sm:pt-6 md:pt-10 pb-28 sm:pb-32 md:pb-12 print:p-0 print:max-w-none">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM TAB BAR (Fixed, thumb-friendly 4-item navigation with safe-area support) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="w-full max-w-lg mx-auto px-1.5 h-16 grid grid-cols-4 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = 
              item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.name}
                className={`min-h-[48px] w-full flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 text-center ${
                  isActive
                    ? 'text-breath-teal font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary font-normal'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-breath-sky-light text-breath-teal scale-105 shadow-2xs' : 'text-ink-muted'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight leading-none truncate max-w-full font-sans">
                  {item.shortName}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

