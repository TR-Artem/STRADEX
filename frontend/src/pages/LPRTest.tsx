import React, { useState, useRef } from 'react';
import { api } from '../services/api';

export default function LPRTest() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('Выберите изображение');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', fileInputRef.current.files[0]);

      const response = await fetch('http://localhost:3102/api/v1/lpr/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка обработки изображения');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при распознавании');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!result?.plateNumber) return;

    try {
      await api.post('/dashboard/parking/sessions', {
        plateNumber: result.plateNumber,
        clientType: 'ONE_TIME',
      });
      alert(`Сессия создана для номера ${result.plateNumber}!`);
    } catch (err: any) {
      alert('Ошибка создания сессии: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Тестирование распознавания номеров (LPR)</h1>
        <div className="text-sm text-gray-500">
          Powered by Tesseract OCR
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Загрузить изображение</h2>
        
        <div className="flex gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          
          <label
            htmlFor="image-upload"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md cursor-pointer"
          >
            Выбрать файл
          </label>
          
          <button
            onClick={handleUpload}
            disabled={!fileInputRef.current?.files?.[0] || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md disabled:opacity-50"
          >
            {loading ? 'Обработка...' : 'Распознать'}
          </button>
        </div>

        {fileInputRef.current?.files?.[0] && (
          <div className="mt-2 text-sm text-gray-400">
            Выбран файл: {fileInputRef.current.files[0].name}
          </div>
        )}
      </div>

      {/* Preview Section */}
      {selectedImage && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Предпросмотр</h2>
          <div className="max-w-lg mx-auto">
            <img
              src={selectedImage}
              alt="Selected"
              className="w-full rounded-lg border border-gray-700"
            />
          </div>
        </div>
      )}

      {/* Result Section */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {result && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Результат распознавания</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Распознанный номер</div>
                <div className="text-3xl font-bold text-green-400 font-mono">
                  {result.plateNumber || 'Не распознан'}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Уверенность</div>
                <div className="text-xl">
                  <span className={result.confidence > 70 ? 'text-green-400' : result.confidence > 50 ? 'text-yellow-400' : 'text-red-400'}>
                    {result.confidence.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Время обработки</div>
                <div className="text-gray-300">{result.processingTime} мс</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Обработано кадров</div>
                <div className="text-gray-300">{result.framesProcessed}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {result.plateNumber && (
                <button
                  onClick={handleCreateSession}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md font-medium"
                >
                  Создать парковочную сессию
                </button>
              )}
              
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Инструкция</h2>
        <div className="text-gray-400 space-y-2 text-sm">
          <p>1. Выберите изображение с номером автомобиля (JPG, PNG и т.д.)</p>
          <p>2. Нажмите "Распознать" для обработки изображения</p>
          <p>3. Если номер распознан успешно, нажмите "Создать парковочную сессию"</p>
          <p className="text-yellow-400">Для видео: сначала сделайте скриншот с кадром, где четко виден номер</p>
        </div>
      </div>
    </div>
  );
}