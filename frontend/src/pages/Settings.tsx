import React from 'react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Организация</h2>
          <div className="space-y-4">
            <SettingField label="Название организации" defaultValue="Демо Паркинг" />
            <SettingField label="ИНН" defaultValue="1234567890" />
            <SettingField label="Город" defaultValue="Москва" />
            <SettingField label="Email" defaultValue="admin@demo.local" />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Настройка парковки</h2>
          <div className="space-y-4">
            <SettingField label="Часовая ставка (₽)" defaultValue="200" type="number" />
            <SettingField label="Первых бесплатных минут" defaultValue="15" type="number" />
            <SettingField label="Макс. ставка за сутки (₽)" defaultValue="500" type="number" />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Платёжная система</h2>
          <div className="space-y-4">
            <SettingField label="YooKassa Shop ID" defaultValue="" />
            <SettingField label="YooKassa Secret Key" defaultValue="" type="password" />
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Тестовый режим</span>
              <ToggleSwitch />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Контроль доступа</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Белый список</span>
              <span className="text-green-400">12 ТС</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Чёрный список</span>
              <span className="text-red-400">2 ТС</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Активные абонементы</span>
              <span className="text-blue-400">45</span>
            </div>
          </div>
        </div>
      </div>

      <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-medium">
        Сохранить изменения
      </button>
    </div>
  );
}

function SettingField({ label, defaultValue, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
      />
    </div>
  );
}

function ToggleSwitch() {
  return (
    <button className="w-12 h-6 bg-gray-700 rounded-full relative">
      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5" />
    </button>
  );
}