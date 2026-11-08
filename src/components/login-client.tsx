'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Scale, AlertCircle } from 'lucide-react';
import { loginSchema, signupSchema } from '@/lib/schemas';
import { loginAction, signupAction } from '@/app/actions/auth';
import { useToast } from '@/components/providers';

interface LoginClientProps {
  isConfigured: boolean;
  signupEnabled: boolean;
}

export function LoginClient({ isConfigured, signupEnabled }: LoginClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setFormError(null);
    setFieldErrors({});
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Tự chuyển sang chữ thường theo đúng quy tắc mục 4
    setUsername(e.target.value.toLowerCase());
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (mode === 'login') {
      const parsed = loginSchema.safeParse({ username, password });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const k = String(issue.path[0] || 'form');
          if (!errs[k]) errs[k] = issue.message;
        }
        setFieldErrors(errs);
        return;
      }

      setSubmitting(true);
      const res = await loginAction(parsed.data);
      setSubmitting(false);

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error || 'Tên đăng nhập hoặc mật khẩu không đúng.');
        return;
      }

      showToast('Đăng nhập thành công.', 'success');
      router.push('/');
      router.refresh();
    } else {
      const parsed = signupSchema.safeParse({
        username,
        password,
        confirmPassword,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const k = String(issue.path[0] || 'form');
          if (!errs[k]) errs[k] = issue.message;
        }
        setFieldErrors(errs);
        return;
      }

      setSubmitting(true);
      const res = await signupAction(parsed.data);
      setSubmitting(false);

      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setFormError(res.error || 'Không thể tạo tài khoản.');
        return;
      }

      showToast('Đã tạo tài khoản và đăng nhập thành công!', 'success');
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#0B1F3A] text-slate-900">
      <div className="w-full max-w-md space-y-6">
        {/* Đầu trang thương hiệu */}
        <div className="text-center text-white space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1B3A6B] border border-white/15 shadow-md mb-1">
            <Scale className="w-6 h-6 text-amber-300" />
          </div>
          <h1 className="serif text-2xl sm:text-3xl font-bold text-white">
            Thư viện Luật Quốc tế
          </h1>
          <p className="text-sm text-slate-300">
            Kho tra cứu điều ước, tập quán, nguyên tắc pháp lý chung và án lệ (IRAC)
          </p>
        </div>

        {/* Cảnh báo nếu chủ dự án chưa cấu hình biến môi trường Supabase */}
        {!isConfigured && (
          <div
            role="alert"
            className="rounded-xl bg-amber-950/90 border border-amber-500/50 p-4 text-amber-100 text-sm space-y-1.5"
          >
            <div className="flex items-center gap-2 font-semibold text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Chưa cấu hình kết nối Supabase</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-100/90">
              Ứng dụng chưa có thông tin kết nối cơ sở dữ liệu trong file{' '}
              <code className="px-1 py-0.5 rounded bg-black/30">.env.local</code>.
              Hãy mở file <strong>README.md</strong> và làm theo hướng dẫn từng bước để kết nối Supabase.
            </p>
          </div>
        )}

        {/* Khung đăng nhập / đăng ký */}
        <div className="surface-card p-6 sm:p-7 shadow-2xl space-y-5">
          {signupEnabled ? (
            <div
              role="tablist"
              aria-label="Chọn đăng nhập hoặc đăng ký"
              className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-card)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`min-h-[42px] rounded-md text-sm font-semibold transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#0B1F3A] text-white dark:bg-blue-600'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => switchMode('signup')}
                className={`min-h-[42px] rounded-md text-sm font-semibold transition cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#0B1F3A] text-white dark:bg-blue-600'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>
          ) : (
            <h2 className="serif text-xl font-semibold text-[var(--text-heading)]">
              Đăng nhập vào thư viện
            </h2>
          )}

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="auth-username"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Tên đăng nhập
              </label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Ví dụ: minh_anh_k48"
                className="field-input"
                required
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                3 đến 20 ký tự, gồm chữ thường không dấu (a-z), số (0-9) hoặc dấu gạch dưới (_).
              </p>
              {fieldErrors.username && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder="Tối thiểu 6 ký tự"
                  className="field-input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
                >
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    placeholder="Nhập lại đúng mật khẩu ở trên"
                    className="field-input pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? 'Ẩn mật khẩu nhập lại'
                        : 'Hiện mật khẩu nhập lại'
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2"
            >
              {submitting
                ? mode === 'login'
                  ? 'Đang đăng nhập...'
                  : 'Đang tạo tài khoản...'
                : mode === 'login'
                  ? 'Đăng nhập'
                  : 'Tạo tài khoản và vào thư viện'}
            </button>
          </form>

          <div className="pt-3 border-t border-[var(--border-card)] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Quên mật khẩu? Hãy nhờ quản trị viên đặt lại cho bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
