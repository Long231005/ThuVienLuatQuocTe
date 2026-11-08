'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/providers';
import { formatDateVN } from '@/lib/utils/normalize';
import { adminResetPasswordAction } from '@/app/actions/auth';
import type { AdminUserItem } from '@/lib/data';
import type { UserProfile } from '@/lib/types';

interface AdminClientProps {
  profile: UserProfile;
  users: AdminUserItem[];
  errorMessage: string | null;
}

export function AdminClient({ users, errorMessage }: AdminClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [targetUser, setTargetUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openResetModal = (u: AdminUserItem) => {
    setTargetUser(u);
    setNewPassword('');
    setShowPassword(false);
    setResetError(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    setResetError(null);

    if (newPassword.length < 6) {
      setResetError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setSubmitting(true);
    const res = await adminResetPasswordAction({
      targetUserId: targetUser.id,
      newPassword,
    });
    setSubmitting(false);

    if (!res.ok) {
      setResetError(res.error || 'Không thể đặt lại mật khẩu.');
      return;
    }

    showToast(
      `Đã đặt lại mật khẩu mới cho @${targetUser.username}.`,
      'success'
    );
    setTargetUser(null);
    router.refresh();
  };

  return (
    <section className="page-transition space-y-6">
      <div>
        <h2 className="serif text-2xl sm:text-3xl font-bold text-[var(--text-heading)]">
          Quản trị thành viên
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Danh sách tài khoản thành viên trong nhóm và hỗ trợ đặt lại mật khẩu khi thành viên quên mật khẩu.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="surface-card p-5 border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/40 flex flex-wrap items-center justify-between gap-4"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-secondary text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-card)] text-[var(--text-secondary)]">
                <th className="py-3.5 px-4 font-semibold">Tên đăng nhập</th>
                <th className="py-3.5 px-4 font-semibold">Vai trò</th>
                <th className="py-3.5 px-4 font-semibold">Ngày tạo</th>
                <th className="py-3.5 px-4 font-semibold">Số bài đã đăng</th>
                <th className="py-3.5 px-4 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-card)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--bg-muted)]/60">
                  <td className="py-3.5 px-4 font-semibold text-[var(--text-heading)]">
                    @{u.username}
                  </td>
                  <td className="py-3.5 px-4">
                    {u.role === 'admin' ? (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700">
                        Admin (Quản trị viên)
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        Thành viên (user)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                    {formatDateVN(u.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                    <strong>{u.totalPosts}</strong> bài ({u.treatyCount} văn kiện,{' '}
                    {u.caseCount} án lệ)
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => openResetModal(u)}
                      className="btn-secondary text-xs py-1.5 px-3 min-h-[38px]"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Đặt lại mật khẩu</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hộp thoại đặt lại mật khẩu */}
      <Modal
        open={Boolean(targetUser)}
        onClose={() => !submitting && setTargetUser(null)}
        title={
          targetUser
            ? `Đặt lại mật khẩu cho @${targetUser.username}`
            : 'Đặt lại mật khẩu'
        }
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
          <p className="text-sm text-[var(--text-secondary)]">
            Nhập mật khẩu mới (tối thiểu 6 ký tự) rồi gửi lại cho thành viên{' '}
            <strong>@{targetUser?.username}</strong>.
          </p>

          <div>
            <label
              htmlFor="admin-new-password"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="admin-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="field-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded text-[var(--text-muted)]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {resetError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                {resetError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-card)]">
            <button
              type="button"
              onClick={() => setTargetUser(null)}
              disabled={submitting}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
