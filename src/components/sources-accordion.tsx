'use client';

import React, { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { SourceLink } from '@/lib/schemas';

interface SourcesAccordionProps {
  sources: SourceLink[];
}

/**
 * Nút "Xem chi tiết" mở/đóng danh sách link nguồn bằng grid-template-rows: 0fr -> 1fr.
 * Nếu bài không có nguồn nào thì ẩn hẳn nút này.
 */
export function SourcesAccordion({ sources }: SourcesAccordionProps) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-md text-xs font-semibold text-[#1B3A6B] dark:text-sky-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <span>Xem chi tiết ({sources.length} nguồn tham khảo)</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className="expand-grid" data-open={open}>
        <div className="expand-inner">
          <div className="mt-2 p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-card)] space-y-2">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Nguồn tham khảo chính thức:
            </p>
            <ul className="space-y-1.5">
              {sources.map((src, idx) => (
                <li key={`${src.url}-${idx}`} className="text-sm">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-[#1B3A6B] dark:text-sky-300 hover:underline break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1" />
                    <span>
                      <span className="font-medium">{src.title}</span>
                      <span className="block text-xs text-[var(--text-muted)] break-all">
                        {src.url}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
