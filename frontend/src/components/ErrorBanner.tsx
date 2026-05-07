import React from 'react';

export default function ErrorBanner({ 
  message, 
  onDismiss 
}: { 
  message: string | null; 
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-red-300">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm">{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-300 ml-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}