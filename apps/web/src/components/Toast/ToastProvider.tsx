'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import styles from './styles.module.css';

// Distinct colors per positive action (user request 2026-09-15), not one
// flat "success" green — publish/republish/draft each read differently at
// a glance. 'error' stays reserved for destructive outcomes (delete).
type ToastKind = 'success' | 'info' | 'warning' | 'error';

interface ToastEntry {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3500;

// App-wide toast primitive — no existing one in this codebase (checked
// 2026-09-15), needed for publish/republish/delete confirmation on
// /manage-courses. Mounted once in the (app) route group layout so any
// page under it can call useToast(). Every toast surfaces from the same
// top-center viewport (user request 2026-09-15 — was split bottom-right/
// top-center before, now unified).
export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  function dismiss(id: number): void {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const KIND_CLASS: Record<ToastKind, string> = {
    success: styles.toastSuccess,
    info: styles.toastInfo,
    warning: styles.toastWarning,
    error: styles.toastError,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.viewportTopCenter} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={KIND_CLASS[t.kind]} onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
