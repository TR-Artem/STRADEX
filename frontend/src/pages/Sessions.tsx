import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import ErrorBanner from '../components/ErrorBanner';

// Типы клиентов
const CLIENT_TYPES = {
  ONE_TIME: { label: 'Разовый', color: 'text-gray-400', bgColor: 'bg-gray-700' },
  REGULAR: { label: 'Постоянный', color: 'text-blue-400', bgColor: 'bg-blue-900/50' },
  TENANT: { label: 'Арендатор', color: 'text-purple-400', bgColor: 'bg-purple-900/50' },
};

export default function Sessions() {
  const { organizationId } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({ 
    plateNumber: '',
    clientType: 'ONE_TIME'
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [filter, clientTypeFilter, organizationId]);

  async function loadSessions() {
    try {
      setLoading(true);
      let endpoint = filter === 'active' 
        ? '/dashboard/sessions/active' 
        : filter === 'completed'
        ? '/dashboard/sessions?status=COMPLETED'
        : '/dashboard/sessions';
      
      if (clientTypeFilter !== 'all') {
        endpoint += (endpoint.includes('?') ? '&' : '?') + `clientType=${clientTypeFilter}`;
      }
      
      const data = await api.get(endpoint);
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Ошибка загрузки сессий:', e);
      setError('Не удалось загрузить сессии. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession() {
    if (!newSession.plateNumber.trim()) return;

    try {
      setCreating(true);
      await api.post('/dashboard/parking/sessions', {
        plateNumber: newSession.plateNumber,
        clientType: newSession.clientType,
      });
      setShowCreateModal(false);
      setNewSession({ plateNumber: '', clientType: 'ONE_TIME' });
      loadSessions();
    } catch (e: any) {
      console.error('Ошибка создания сессии:', e);
      alert('Ошибка: ' + (e.message || 'Не удалось создать сессию'));
    } finally {
      setCreating(false);
    }
  }

  function formatDuration(minutes: number | null) {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  }

  function formatTime(date: string | Date) {
    return new Date(date).toLocaleString('ru-RU');
  }

  function formatAmount(kopecks: number | null) {
    if (!kopecks) return '-';
    return `₽${(kopecks / 100).toFixed(0)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Парковочные сессии</h1>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <FilterButton active={filter === 'active'} onClick={() => setFilter('active')}>
              Активные
            </FilterButton>
            <FilterButton active={filter === 'completed'} onClick={() => setFilter('completed')}>
              Завершённые
            </FilterButton>
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
              Все
            </FilterButton>
          </div>
          <select
            value={clientTypeFilter}
            onChange={(e) => setClientTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          >
            <option value="all">Все клиенты</option>
            <option value="ONE_TIME">Разовые</option>
            <option value="REGULAR">Постоянные</option>
            <option value="TENANT">Арендаторы</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md font-medium"
          >
            + Новая сессия
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Номер</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Тип клиента</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Въезд</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Выезд</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Длит.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Сумма</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Загрузка...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Сессии не найдены. Нажмите "Новая сессия" для создания.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono font-semibold">{session.plateNumber}</td>
                  <td className="px-4 py-3">
                    <ClientTypeBadge clientType={session.clientType || 'ONE_TIME'} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatTime(session.entryTime)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {session.exitTime ? formatTime(session.exitTime) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDuration(session.duration)}</td>
                  <td className="px-4 py-3 text-green-400">{formatAmount(session.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Создать парковочную сессию</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Номер автомобиля</label>
                <input
                  type="text"
                  value={newSession.plateNumber}
                  onChange={(e) => setNewSession({ ...newSession, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="А123БВ77"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Тип клиента</label>
                <select
                  value={newSession.clientType}
                  onChange={(e) => setNewSession({ ...newSession, clientType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="ONE_TIME">Разовый клиент</option>
                  <option value="REGULAR">Постоянный клиент</option>
                  <option value="TENANT">Арендатор</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                  disabled={creating}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSession.plateNumber.trim() || creating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md disabled:opacity-50"
                >
                  {creating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function ClientTypeBadge({ clientType }: { clientType: string }) {
  const config = CLIENT_TYPES[clientType as keyof typeof CLIENT_TYPES] || CLIENT_TYPES.ONE_TIME;
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-900/50 text-green-400',
    COMPLETED: 'bg-gray-700 text-gray-300',
    PAID: 'bg-blue-900/50 text-blue-400',
    UNPAID: 'bg-red-900/50 text-red-400',
  };

  const labels: Record<string, string> = {
    ACTIVE: 'Активная',
    COMPLETED: 'Завершена',
    PAID: 'Оплачена',
    UNPAID: 'Не оплачена',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.ACTIVE}`}>
      {labels[status] || status}
    </span>
  );
}