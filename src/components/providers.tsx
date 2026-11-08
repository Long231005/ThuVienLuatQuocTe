'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { DisplayScope } from '@/lib/types';

// 1. CONTEXT PHẠM VI HIỂN THỊ ("all" | "mine")
// Chỉ lưu tùy chọn giao diện này ở localStorage, tuyệt đối không lưu dữ liệu nghiệp vụ
const SCOPE_STORAGE_KEY = 'ilaw_display_scope_v1';
const SCOPE_EVENT_NAME = 'ilaw-scope-change';

function subscribeScope(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(SCOPE_EVENT_NAME, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SCOPE_EVENT_NAME, callback);
  };
}

function getScopeSnapshot(): DisplayScope {
  if (typeof window === 'undefined') return 'all';
  try {
    const saved = window.localStorage.getItem(SCOPE_STORAGE_KEY);
    return saved === 'mine' ? 'mine' : 'all';
  } catch {
    return 'all';
  }
}

function getScopeServerSnapshot(): DisplayScope {
  return 'all';
}

interface ScopeContextValue {
  scope: DisplayScope;
  setScope: (next: DisplayScope) => void;
  toggleScope: () => void;
}

const ScopeContext = createContext<ScopeContextValue>({
  scope: 'all',
  setScope: () => {},
  toggleScope: () => {},
});

export function useDisplayScope() {
  return useContext(ScopeContext);
}

// 2. CONTEXT TOAST THÔNG BÁO
export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const scope = useSyncExternalStore(
    subscribeScope,
    getScopeSnapshot,
    getScopeServerSnapshot
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const setScope = useCallback((next: DisplayScope) => {
    try {
      window.localStorage.setItem(SCOPE_STORAGE_KEY, next);
      window.dispatchEvent(new Event(SCOPE_EVENT_NAME));
    } catch {
      // Bỏ qua
    }
  }, []);

  const toggleScope = useCallback(() => {
    const current = getScopeSnapshot();
    const next: DisplayScope = current === 'all' ? 'mine' : 'all';
    try {
      window.localStorage.setItem(SCOPE_STORAGE_KEY, next);
      window.dispatchEvent(new Event(SCOPE_EVENT_NAME));
    } catch {
      // Bỏ qua
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ScopeContext.Provider value={{ scope, setScope, toggleScope }}>
        <ToastContext.Provider value={{ showToast }}>
          {children}
          {/* Vùng hiển thị Toast */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg text-sm ${
                  t.type === 'success'
                    ? 'bg-emerald-950 text-emerald-50 border-emerald-700'
                    : 'bg-red-950 text-red-50 border-red-700'
                }`}
              >
                {t.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="flex-1 leading-snug">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Đóng thông báo"
                  className="p-1 rounded hover:bg-white/10 text-white/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </ScopeContext.Provider>
    </NextThemesProvider>
  );
}
