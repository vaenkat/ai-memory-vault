import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  onRetry?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 transition-all duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : toast.type === 'success'
              ? 'bg-stone-900 border-stone-800 text-stone-100'
              : 'bg-stone-50 border-stone-200 text-stone-900'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 text-sm">
            <p className="font-medium">{toast.title}</p>
            {toast.message && (
              <p className={`mt-0.5 text-xs ${toast.type === 'error' ? 'text-rose-700' : 'text-stone-300'}`}>
                {toast.message}
              </p>
            )}
            {toast.onRetry && (
              <button
                id={`toast-retry-btn-${toast.id}`}
                onClick={toast.onRetry}
                className="mt-2 text-xs font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                Retry action
              </button>
            )}
          </div>

          <button
            id={`toast-close-btn-${toast.id}`}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
