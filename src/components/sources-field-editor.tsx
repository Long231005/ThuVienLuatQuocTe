'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SourceLink } from '@/lib/schemas';

export interface SourceRowError {
  title?: string;
  url?: string;
}

interface SourcesFieldEditorProps {
  sources: SourceLink[];
  onChange: (next: SourceLink[]) => void;
  rowErrors?: Record<number, SourceRowError>;
  idPrefix: string;
}

export function SourcesFieldEditor({
  sources,
  onChange,
  rowErrors = {},
  idPrefix,
}: SourcesFieldEditorProps) {
  const handleAddRow = () => {
    onChange([...sources, { title: '', url: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(sources.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    field: 'title' | 'url',
    value: string
  ) => {
    const updated = sources.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-[var(--border-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="block text-sm font-medium text-[var(--text-secondary)]">
            Nguồn tham khảo (tùy chọn)
          </span>
          <span className="block text-xs text-[var(--text-muted)]">
            Mỗi nguồn gồm tiêu đề và đường dẫn bắt đầu bằng http:// hoặc https://
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddRow}
          className="btn-secondary text-xs py-1.5 px-3 min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm dòng nguồn</span>
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic">
          Chưa có nguồn tham khảo nào. Bấm &ldquo;Thêm dòng nguồn&rdquo; nếu bạn muốn đính kèm đường dẫn văn bản gốc.
        </p>
      ) : (
        <div className="space-y-3">
          {sources.map((row, idx) => {
            const err = rowErrors[idx];
            const titleId = `${idPrefix}-src-title-${idx}`;
            const urlId = `${idPrefix}-src-url-${idx}`;
            return (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-card)] space-y-2"
              >
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor={titleId}
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                    >
                      Tiêu đề nguồn #{idx + 1}
                    </label>
                    <input
                      id={titleId}
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        handleFieldChange(idx, 'title', e.target.value)
                      }
                      placeholder="Ví dụ: Toàn văn trên UN Treaty Collection"
                      className="field-input text-sm"
                    />
                    {err?.title && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {err.title}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={urlId}
                      className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                    >
                      Đường dẫn URL #{idx + 1}
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          id={urlId}
                          type="url"
                          value={row.url}
                          onChange={(e) =>
                            handleFieldChange(idx, 'url', e.target.value)
                          }
                          placeholder="https://legal.un.org/..."
                          className="field-input text-sm"
                        />
                        {err?.url && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {err.url}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        aria-label={`Xóa dòng nguồn số ${idx + 1}`}
                        className="min-w-[44px] min-h-[42px] inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-100/70 dark:text-red-400 dark:hover:bg-red-950/50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
