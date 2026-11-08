import React from 'react';
import { formatDateVN, isRecordUpdated } from '@/lib/utils/normalize';
import type { UserRole } from '@/lib/types';

interface AuthorMetaProps {
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export function AuthorMeta({
  username,
  role,
  createdAt,
  updatedAt,
}: AuthorMetaProps) {
  const createdStr = formatDateVN(createdAt);
  const updated = isRecordUpdated(createdAt, updatedAt);
  const updatedStr = updated ? formatDateVN(updatedAt) : '';

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-card)]">
      <span className="inline-flex items-center gap-1.5">
        <span>Người đăng:</span>
        <strong className="font-semibold text-[var(--text-secondary)]">
          @{username}
        </strong>
        {role === 'admin' && (
          <span className="text-[11px] font-semibold px-1.5 py-0.2 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 rounded border border-amber-300/60 dark:border-amber-700">
            Admin
          </span>
        )}
      </span>
      {createdStr && (
        <>
          <span aria-hidden="true">·</span>
          <span>Ngày đăng: {createdStr}</span>
        </>
      )}
      {updated && updatedStr && (
        <>
          <span aria-hidden="true">·</span>
          <span>Cập nhật {updatedStr}</span>
        </>
      )}
    </div>
  );
}
