'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, BookOpen, Scale, FileDown } from 'lucide-react';
import { useDisplayScope } from '@/components/providers';
import { SOURCE_CATEGORIES } from '@/lib/schemas';
import { BADGE_STYLES } from '@/lib/constants/badges';
import { normalizeForSearch } from '@/lib/utils/normalize';
import type { CaseRecord, TreatyRecord, UserProfile } from '@/lib/types';

interface DashboardClientProps {
  profile: UserProfile;
  treaties: TreatyRecord[];
  cases: CaseRecord[];
  errorMessage: string | null;
}

export function DashboardClient({
  profile,
  treaties,
  cases,
  errorMessage,
}: DashboardClientProps) {
  const router = useRouter();
  const { scope } = useDisplayScope();
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc theo phạm vi hiển thị ("Tất cả bài" | "Bài của tôi")
  const scopedTreaties = useMemo(() => {
    if (scope === 'mine') {
      return treaties.filter((t) => t.author_id === profile.id);
    }
    return treaties;
  }, [treaties, scope, profile.id]);

  const scopedCases = useMemo(() => {
    if (scope === 'mine') {
      return cases.filter((c) => c.author_id === profile.id);
    }
    return cases;
  }, [cases, scope, profile.id]);

  // 5 thẻ số liệu theo đúng file gốc
  const stats = useMemo(() => {
    return [
      { label: 'Tổng số văn kiện đã lưu', value: scopedTreaties.length },
      { label: 'Số lượng án lệ', value: scopedCases.length },
      ...SOURCE_CATEGORIES.map((category) => ({
        label: category,
        value: scopedTreaties.filter((t) => t.category === category).length,
      })),
    ];
  }, [scopedTreaties, scopedCases]);

  // Tìm kiếm toàn văn không phân biệt dấu tiếng Việt và hoa thường, tìm trong cả tên người đăng
  const normalizedQuery = useMemo(
    () => normalizeForSearch(searchQuery),
    [searchQuery]
  );

  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return { treatyHits: [], caseHits: [] };
    }

    const treatyHits = scopedTreaties.filter((t) => {
      const haystack = normalizeForSearch(
        [
          t.name,
          t.category,
          t.date_text,
          t.content,
          t.tags.join(' '),
          t.author_username,
        ].join(' ')
      );
      return haystack.includes(normalizedQuery);
    });

    const caseHits = scopedCases.filter((c) => {
      const haystack = normalizeForSearch(
        [
          c.name,
          c.court,
          c.year,
          c.facts,
          c.issues,
          c.holding,
          c.significance,
          c.tags.join(' '),
          c.author_username,
        ].join(' ')
      );
      return haystack.includes(normalizedQuery);
    });

    return { treatyHits, caseHits };
  }, [normalizedQuery, scopedTreaties, scopedCases]);

  const totalCount = scopedTreaties.length + scopedCases.length;

  return (
    <section className="page-transition space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="serif text-2xl sm:text-3xl font-bold text-[var(--text-heading)]">
            Tổng quan
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Đang hiển thị số liệu và tìm kiếm trong:{' '}
            <strong className="text-[var(--text-secondary)]">
              {scope === 'all' ? 'Tất cả bài viết của nhóm' : `Bài viết của tôi (@${profile.username})`}
            </strong>
          </p>
        </div>
      </div>

      {/* Trạng thái lỗi */}
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

      {/* 5 thẻ số liệu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((item, idx) => (
          <div
            key={item.label}
            style={{ animationDelay: `${Math.min(idx, 9) * 35}ms` }}
            className="surface-card card-interactive stagger-item p-5 flex flex-col justify-between"
          >
            <div className="serif text-3xl sm:text-4xl font-bold text-[var(--text-heading)]">
              {item.value}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-1.5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Ô tìm kiếm toàn văn nhanh */}
      <div className="surface-card p-5 sm:p-6 space-y-4">
        <div>
          <label
            htmlFor="global-search"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            Tìm kiếm toàn văn nhanh (cả điều ước, tập quán, nguyên tắc và án lệ)
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ví dụ: thềm lục địa, estoppel, eo biển, hoặc @tên_người_đăng..."
              className="field-input pl-10"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Hỗ trợ tìm có dấu hoặc không dấu tiếng Việt, tìm theo nội dung, từ khóa hoặc tên người đăng.
          </p>
        </div>

        {/* Kết quả tìm kiếm toàn văn */}
        {!normalizedQuery ? (
          <p className="text-sm text-[var(--text-muted)] pt-1">
            Nhập từ khóa để tìm trong tất cả văn kiện và án lệ.
          </p>
        ) : searchResults.treatyHits.length === 0 &&
          searchResults.caseHits.length === 0 ? (
          <div className="p-4 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-card)] text-sm text-[var(--text-secondary)]">
            Không tìm thấy kết quả phù hợp với từ khóa{' '}
            <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> trong phạm vi đang chọn.
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Nhóm 1: Điều ước & Tập quán */}
            {searchResults.treatyHits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Điều ước, Tập quán &amp; Nguyên tắc ({searchResults.treatyHits.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.treatyHits.map((t) => (
                    <Link
                      key={t.id}
                      href={`/treaties?open=${encodeURIComponent(t.id)}`}
                      className="block w-full rounded-lg border border-[var(--border-card)] px-4 py-3 hover:bg-[var(--bg-muted)] transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span
                            className={`text-xs font-medium rounded px-2 py-0.5 shrink-0 ${
                              BADGE_STYLES[t.category]
                            }`}
                          >
                            {t.category}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-heading)]">
                            {t.name}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          Người đăng: @{t.author_username}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Nhóm 2: Án lệ IRAC */}
            {searchResults.caseHits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  Án lệ quốc tế ({searchResults.caseHits.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.caseHits.map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases?open=${encodeURIComponent(c.id)}`}
                      className="block w-full rounded-lg border border-[var(--border-card)] px-4 py-3 hover:bg-[var(--bg-muted)] transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-xs font-medium bg-indigo-100 text-indigo-900 dark:bg-indigo-950/90 dark:text-indigo-200 dark:border dark:border-indigo-800 rounded px-2 py-0.5 shrink-0">
                            Án lệ · {c.court} {c.year}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-heading)]">
                            {c.name}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          Người đăng: @{c.author_username}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trạng thái rỗng thân thiện nếu kho chưa có bài nào */}
      {totalCount === 0 && !errorMessage && (
        <div className="surface-card p-6 sm:p-8 text-center space-y-4">
          <h3 className="serif text-xl font-semibold text-[var(--text-heading)]">
            {scope === 'mine'
              ? 'Bạn chưa đăng bài viết nào'
              : 'Thư viện hiện chưa có bài viết nào'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
            {scope === 'mine'
              ? 'Bạn có thể thêm từng văn kiện, án lệ mới hoặc dùng tính năng Nhập dữ liệu để đưa nhiều bài học lên cùng lúc.'
              : 'Hãy bắt đầu bằng cách thêm văn kiện/án lệ đầu tiên hoặc nhập file dữ liệu mẫu trong trang Nhập / Xuất dữ liệu.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href="/treaties" className="btn-secondary">
              <BookOpen className="w-4 h-4" />
              <span>Thêm văn kiện</span>
            </Link>
            <Link href="/cases" className="btn-secondary">
              <Scale className="w-4 h-4" />
              <span>Thêm án lệ</span>
            </Link>
            <Link href="/import" className="btn-primary">
              <FileDown className="w-4 h-4" />
              <span>Nhập dữ liệu hàng loạt</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
