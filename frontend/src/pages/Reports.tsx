import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ErrorBanner from '../components/ErrorBanner';

export default function Reports() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [reportType, setReportType] = useState<'revenue' | 'sessions' | 'events'>('revenue');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [period]);

  async function loadReport() {
    try {
      setLoading(true);
      if (period === 'today') {
        const data = await api.get('/reports/daily');
        setReportData(data);
      } else {
        const data = await api.get('/reports/revenue');
        setReportData(data);
      }
    } catch (e) {
      console.error('Ошибка загрузки отчёта:', e);
      setError('Не удалось загрузить отчёт. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  }

  function formatAmount(kopecks: number) {
    return `₽${(kopecks / 100).toFixed(0)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Финансовые отчёты</h1>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="flex gap-4">
        <div className="flex bg-gray-900 rounded-lg p-1">
          <PeriodButton active={period === 'today'} onClick={() => setPeriod('today')}>Сегодня</PeriodButton>
          <PeriodButton active={period === 'week'} onClick={() => setPeriod('week')}>Неделя</PeriodButton>
          <PeriodButton active={period === 'month'} onClick={() => setPeriod('month')}>Месяц</PeriodButton>
        </div>
        <div className="flex bg-gray-900 rounded-lg p-1">
          <PeriodButton active={reportType === 'revenue'} onClick={() => setReportType('revenue')}>Выручка</PeriodButton>
          <PeriodButton active={reportType === 'sessions'} onClick={() => setReportType('sessions')}>Сессии</PeriodButton>
          <PeriodButton active={reportType === 'events'} onClick={() => setReportType('events')}>События</PeriodButton>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Загрузка...</div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard title="Общая выручка" value={formatAmount(reportData.totalRevenue || 0)} />
            <SummaryCard title="Сессий" value={reportData.totalSessions || 0} />
            <SummaryCard title="Ср. длит." value={`${reportData.avgDuration || 0} мин`} />
            <SummaryCard title="Ср. чек" value={formatAmount(reportData.avgCheck || 0)} />
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Выручка по дням</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Выручка</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Транзакций</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(reportData.dailyData || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Нет данных за выбранный период
                    </td>
                  </tr>
                ) : (
                  (reportData.dailyData || []).map((row: any) => (
                    <tr key={row.date} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4">{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-6 py-4 text-green-400 font-semibold">{formatAmount(row.amount)}</td>
                      <td className="px-6 py-4 text-gray-400">{row.transactions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-gray-500">Выберите период для просмотра отчёта</div>
      )}
    </div>
  );
}

function PeriodButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ title, value }: any) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}