import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ErrorBanner from '../components/ErrorBanner';

export default function Tariffs() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTariffs();
  }, []);

  async function loadTariffs() {
    try {
      const data = await api.get('/parking/tariffs?locationId=default');
      setTariffs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Ошибка загрузки тарифов:', e);
      setError('Не удалось загрузить тарифы. Проверьте подключение к серверу.');
      setTariffs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройка тарифов</h1>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TariffCard
          title="Стандартный"
          rate={20000}
          description="Базовая почасовая ставка"
        />
        <TariffCard
          title="Ночной (22:00-08:00)"
          rate={15000}
          description="Сниженная ночная ставка"
        />
        <TariffCard
          title="Выходные"
          rate={25000}
          description="Повышенная ставка в выходные"
        />
        <TariffCard
          title="Максимум за сутки"
          rate={50000}
          description="Максимальная плата за день"
        />
      </div>

      <TariffBuilder />
    </div>
  );
}

function TariffCard({ title, rate, description }: any) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <span className="text-2xl font-bold text-indigo-400">
          ₽{(rate / 100).toFixed(0)}
        </span>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
      <button className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">
        Редактировать
      </button>
    </div>
  );
}

function TariffBuilder() {
  const [rules, setRules] = useState([
    { hours: 1, rate: 200 },
    { hours: 2, rate: 150 },
  ]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">Настройка прогрессивных тарифов</h2>
      <p className="text-sm text-gray-500 mb-4">
        Настройте дифференцированные ставки для разных временных периодов
      </p>

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-4 bg-gray-800 p-3 rounded">
            <span className="text-gray-400">Первые {rule.hours}ч:</span>
            <input
              type="number"
              value={rule.rate}
              onChange={(e) => {
                const newRules = [...rules];
                newRules[index].rate = parseInt(e.target.value) || 0;
                setRules(newRules);
              }}
              className="w-24 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white"
            />
            <span className="text-gray-400">₽/час</span>
            <button
              onClick={() => setRules(rules.filter((_, i) => i !== index))}
              className="text-red-400 hover:text-red-300 ml-auto"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setRules([...rules, { hours: rules.length + 1, rate: 100 }])}
        className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
      >
        + Добавить уровень
      </button>
    </div>
  );
}