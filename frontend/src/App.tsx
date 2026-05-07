import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import Passes from './pages/Passes';
import Tariffs from './pages/Tariffs';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LPRTest from './pages/LPRTest';
import { api } from './services/api';
import { AuthProvider, useAuth, ensureDefaultOrg } from './services/auth';

function AppContent() {
  const { organizationId } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    } else {
      // If no org, just fetch general stats
      fetchStats();
    }
  }, [organizationId]);

  async function fetchStats() {
    try {
      const endpoint = organizationId
        ? `/dashboard/statistics?organizationId=${organizationId}`
        : '/dashboard/statistics';
      const data = await api.get(endpoint);
      setStats(data);
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
      setError('Сервер недоступен');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-indigo-400">
              STRADEX
            </Link>
            <div className="flex gap-6">
              <NavLink to="/">Панель</NavLink>
              <NavLink to="/sessions">Сессии</NavLink>
              <NavLink to="/passes">Пропуска</NavLink>
              <NavLink to="/tariffs">Тарифы</NavLink>
              <NavLink to="/reports">Отчёты</NavLink>
              <NavLink to="/lpr">Камера</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {error && (
              <span className="text-red-400 text-xs px-2 py-1 bg-red-900/30 rounded" title={error}>
                Нет подключения
              </span>
            )}
            <StatusBadge
              label="Активные"
              value={stats?.activeSessions ?? 0}
              color="text-green-400"
            />
            <StatusBadge
              label="Выручка"
              value={`₽${((stats?.todayRevenue ?? 0) / 100).toFixed(0)}`}
              color="text-yellow-400"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/passes" element={<Passes />} />
          <Route path="/tariffs" element={<Tariffs />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/lpr" element={<LPRTest />} />
        </Routes>
      </main>

      <ProgressBar />
      <ScrollToTop />
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureDefaultOrg().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-400 mb-2">STRADEX</div>
          <div className="text-gray-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}

function StatusBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-right">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrollPercent);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
      <div
        className="h-full bg-indigo-500 transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 p-3 bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-500 transition-colors"
      aria-label="Наверх"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}

export default App;