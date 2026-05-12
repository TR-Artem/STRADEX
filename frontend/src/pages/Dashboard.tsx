import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ErrorBanner from '../components/ErrorBanner';

// Типы клиентов для отображения
const CLIENT_TYPES = {
  ONE_TIME: { label: 'Разовые', color: 'text-gray-400', bgColor: 'bg-gray-700' },
  REGULAR: { label: 'Постоянные', color: 'text-blue-400', bgColor: 'bg-blue-900/50' },
  TENANT: { label: 'Арендаторы', color: 'text-purple-400', bgColor: 'bg-purple-900/50' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [clientStats, setClientStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const data = await api.get('/dashboard/statistics');
      setStats(data);

      // Загружаем статистику по типам клиентов
      const sessionsData = await api.get('/dashboard/parking/sessions?status=COMPLETED');
      const sessions = Array.isArray(sessionsData) ? sessionsData : [];
      
      // Группируем по типу клиента
      const byType: Record<string, { count: number; revenue: number }> = {
        ONE_TIME: { count: 0, revenue: 0 },
        REGULAR: { count: 0, revenue: 0 },
        TENANT: { count: 0, revenue: 0 },
      };
      
      sessions.forEach((s: any) => {
        const type = s.clientType || 'ONE_TIME';
        if (byType[type]) {
          byType[type].count++;
          byType[type].revenue += s.amount || 0;
        }
      });
      
      setClientStats(byType);
    } catch (e) {
      console.error('Ошибка загрузки панели:', e);
      setError('Не удалось загрузить данные. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Панель управления</h1>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Активные сессии"
          value={stats?.activeSessions ?? 0}
          icon="🚗"
          color="bg-blue-500"
        />
        <StatCard
          title="Выручка за сегодня"
          value={`₽${((stats?.todayRevenue ?? 0) / 100).toFixed(0)}`}
          icon="💰"
          color="bg-green-500"
        />
        <StatCard
          title="Въезды сегодня"
          value={stats?.todayEntries ?? 0}
          icon="➡️"
          color="bg-purple-500"
        />
        <StatCard
          title="Выезды сегодня"
          value={stats?.todayExits ?? 0}
          icon="⬅️"
          color="bg-orange-500"
        />
      </div>

      {/* Статистика по типам клиентов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(CLIENT_TYPES).map(([type, config]) => {
          const data = clientStats?.[type] || { count: 0, revenue: 0 };
          return (
            <div key={type} className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded text-sm font-medium ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-gray-500 text-sm">{data.count} сессий</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                ₽{(data.revenue / 100).toFixed(0)}
              </div>
              <div className="text-gray-500 text-sm mt-1">выручка</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Загруженность">
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="text-5xl font-bold text-indigo-400">
                {stats?.occupancyRate ?? 0}%
              </div>
              <div className="text-gray-500 mt-2">Процент загруженности</div>
            </div>
          </div>
          <OccupancyBar percent={stats?.occupancyRate ?? 0} />
        </Card>

        <Card title="Последние события">
          <div className="text-center text-gray-500 py-8">
            Нет событий
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-gray-500 text-sm">{title}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function OccupancyBar({ percent }: { percent: number }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}