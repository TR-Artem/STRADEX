import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Passes() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    passType: 'SINGLE',
    validDays: 7,
    maxUses: 1,
  });

  useEffect(() => {
    loadPasses();
  }, []);

  async function loadPasses() {
    try {
      const data = await api.get('/dashboard/guest-passes');
      setPasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Ошибка загрузки пропусков:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePass() {
    if (!formData.plateNumber.trim()) return;

    try {
      setCreating(true);
      const now = new Date();
      const validTo = new Date(now.getTime() + formData.validDays * 86400000);

      await api.post('/dashboard/guest-passes', {
        plateNumber: formData.plateNumber,
        passType: formData.passType,
        validFrom: now.toISOString(),
        validTo: validTo.toISOString(),
        maxUses: formData.maxUses,
        createdBy: 'admin',
      });

      setShowModal(false);
      setFormData({ plateNumber: '', passType: 'SINGLE', validDays: 7, maxUses: 1 });
      loadPasses();
    } catch (e: any) {
      console.error('Ошибка создания пропуска:', e);
      alert('Ошибка: ' + (e.message || 'Не удалось создать пропуск'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Гостевые пропуска</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-medium"
        >
          + Создать пропуск
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PassTypeCard
          title="Одноразовый"
          description="Однократный въезд"
          icon="🎫"
        />
        <PassTypeCard
          title="Многоразовый"
          description="Множество въездов в период действия"
          icon="🎟️"
        />
        <PassTypeCard
          title="Периодический"
          description="Действует в указанные даты"
          icon="📅"
        />
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Номер</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Тип</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Действует до</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Осталось</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Загрузка...</td>
              </tr>
            ) : passes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Гостевые пропуска ещё не созданы. Нажмите "Создать пропуск".
                </td>
              </tr>
            ) : (
              passes.map((pass) => (
                <tr key={pass.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono font-semibold">{pass.plateNumber}</td>
                  <td className="px-4 py-3 text-sm">{pass.passType}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(pass.validTo).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">{pass.usesRemaining}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pass.usesRemaining > 0 ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {pass.usesRemaining > 0 ? 'Активен' : 'Использован'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Создать гостевой пропуск</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Номер автомобиля</label>
                <input
                  type="text"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="А123БВ77"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Тип пропуска</label>
                <select
                  value={formData.passType}
                  onChange={(e) => setFormData({ ...formData, passType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="SINGLE">Одноразовый</option>
                  <option value="MULTIPLE">Многоразовый</option>
                  <option value="PERIOD">Периодический</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Количество дней</label>
                <input
                  type="number"
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Макс. использований</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                  disabled={creating}
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreatePass}
                  disabled={!formData.plateNumber.trim() || creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50"
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

function PassTypeCard({ title, description, icon }: any) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}