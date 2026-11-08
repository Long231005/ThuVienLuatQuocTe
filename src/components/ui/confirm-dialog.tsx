'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}

/**
 * Hộp xác nhận xóa tự làm (thay thế hoàn toàn confirm() của trình duyệt).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xác nhận xóa',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title={title} maxWidthClass="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-[var(--border-card)]">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-800 text-white transition cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Đang xóa...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
