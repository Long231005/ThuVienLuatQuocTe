'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useDisplayScope, useToast } from '@/components/providers';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AuthorMeta } from '@/components/author-meta';
import { SourcesAccordion } from '@/components/sources-accordion';
import {
  SourcesFieldEditor,
  type SourceRowError,
} from '@/components/sources-field-editor';
import { caseInputSchema, type SourceLink } from '@/lib/schemas';
import { normalizeForSearch } from '@/lib/utils/normalize';
import { deleteCaseAction, saveCaseAction } from '@/app/actions/library';
import type { CaseRecord, UserProfile } from '@/lib/types';

interface CasesClientProps {
  profile: UserProfile;
  initialCases: CaseRecord[];
  errorMessage: string | null;
  openId: string | null;
}

const PAGE_SIZE = 30;

export function CasesClient({
  profile,
  initialCases,
  errorMessage,
  openId,
}: CasesClientProps) {
  const router = useRouter();
  const { scope } = useDisplayScope();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    openId ? new Set([openId]) : new Set()
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(openId);

  // Trạng thái hộp thoại thêm/sửa án lệ
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [court, setCourt] = useState('');
  const [year, setYear] = useState('');
  const [facts, setFacts] = useState('');
  const [issues, setIssues] = useState('');
  const [holding, setHolding] = useState('');
  const [significance, setSignificance] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [sources, setSources] = useState<SourceLink[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sourceRowErrors, setSourceRowErrors] = useState<
    Record<number, SourceRowError>
  >({});
  const [saving, setSaving] = useState(false);

  // Trạng thái hộp xác nhận xóa
  const [deleteTarget, setDeleteTarget] = useState<CaseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scopedCases = useMemo(() => {
    if (scope === 'mine') {
      return initialCases.filter(
        (c) => c.author_id === profile.id || (openId && c.id === openId)
      );
    }
    return initialCases;
  }, [initialCases, scope, profile.id, openId]);

  const normalizedQuery = useMemo(
    () => normalizeForSearch(searchQuery),
    [searchQuery]
  );

  const filteredCases = useMemo(() => {
    if (!normalizedQuery) return scopedCases;
    return scopedCases.filter((c) => {
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
  }, [scopedCases, normalizedQuery]);

  const effectiveVisibleCount = useMemo(() => {
    if (!openId) return visibleCount;
    const idx = filteredCases.findIndex((c) => c.id === openId);
    if (idx >= visibleCount) return idx + 10;
    return visibleCount;
  }, [openId, filteredCases, visibleCount]);

  // Mở rộng, cuộn tới và làm nổi bật khi mở từ tìm kiếm toàn văn (?open=<id>)
  useEffect(() => {
    if (!openId) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`case-card-${openId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    const clearTimer = window.setTimeout(() => {
      setHighlightedId(null);
    }, 2600);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [openId]);

  const visibleCases = useMemo(
    () => filteredCases.slice(0, effectiveVisibleCount),
    [filteredCases, effectiveVisibleCount]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const canModify = (item: CaseRecord) =>
    profile.role === 'admin' || item.author_id === profile.id;

  const openAddModal = () => {
    setEditingId(undefined);
    setName('');
    setCourt('');
    setYear('');
    setFacts('');
    setIssues('');
    setHolding('');
    setSignificance('');
    setTagsText('');
    setSources([]);
    setFieldErrors({});
    setSourceRowErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item: CaseRecord) => {
    setEditingId(item.id);
    setName(item.name);
    setCourt(item.court);
    setYear(String(item.year));
    setFacts(item.facts);
    setIssues(item.issues);
    setHolding(item.holding);
    setSignificance(item.significance);
    setTagsText(item.tags.join(', '));
    setSources(item.sources.map((s) => ({ title: s.title, url: s.url })));
    setFieldErrors({});
    setSourceRowErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSourceRowErrors({});

    const nonEmptySources = sources.filter(
      (s) => s.title.trim().length > 0 || s.url.trim().length > 0
    );

    const rawCandidate = {
      name,
      court,
      year,
      facts,
      issues,
      holding,
      significance,
      tags: tagsText,
      sources: nonEmptySources,
    };

    const parsed = caseInputSchema.safeParse(rawCandidate);
    if (!parsed.success) {
      const fErrs: Record<string, string> = {};
      const sErrs: Record<number, SourceRowError> = {};

      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'sources' && typeof issue.path[1] === 'number') {
          const rowIdx = issue.path[1];
          const subField = issue.path[2] === 'title' ? 'title' : 'url';
          sErrs[rowIdx] = {
            ...sErrs[rowIdx],
            [subField]: issue.message,
          };
        } else {
          const key = String(issue.path[0] || 'form');
          if (!fErrs[key]) fErrs[key] = issue.message;
        }
      }
      setFieldErrors(fErrs);
      setSourceRowErrors(sErrs);
      return;
    }

    setSaving(true);
    const res = await saveCaseAction(parsed.data, editingId);
    setSaving(false);

    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      showToast(res.error || 'Không thể lưu án lệ.', 'error');
      return;
    }

    if (res.id) {
      setExpandedIds((prev) => new Set(prev).add(res.id!));
    }
    setModalOpen(false);
    showToast(
      editingId ? 'Đã cập nhật án lệ thành công.' : 'Đã thêm án lệ mới.',
      'success'
    );
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteCaseAction(deleteTarget.id);
    setDeleting(false);

    if (!res.ok) {
      showToast(res.error || 'Không thể xóa án lệ.', 'error');
      return;
    }

    setDeleteTarget(null);
    showToast('Đã xóa án lệ.', 'success');
    router.refresh();
  };

  return (
    <section className="page-transition space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="serif text-2xl sm:text-3xl font-bold text-[var(--text-heading)]">
            Thư viện Án lệ
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Hiển thị {filteredCases.length} án lệ tóm tắt theo khung IRAC (
            {scope === 'all' ? 'Tất cả bài' : 'Bài của tôi'})
          </p>
        </div>
        <button type="button" onClick={openAddModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>Thêm án lệ</span>
        </button>
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

      {/* Thanh tìm kiếm án lệ */}
      <div className="relative w-full sm:w-96">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="case-search"
          type="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Tìm theo tên vụ việc, cơ quan hoặc nội dung"
          aria-label="Tìm án lệ"
          className="field-input pl-10"
        />
      </div>

      {/* Danh sách án lệ */}
      {filteredCases.length === 0 ? (
        <div className="surface-card p-8 text-center space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Không tìm thấy án lệ phù hợp. Thử đổi từ khóa hoặc bấm &ldquo;Thêm án lệ&rdquo;.
          </p>
          <div>
            <button type="button" onClick={openAddModal} className="btn-secondary">
              <Plus className="w-4 h-4" />
              <span>Thêm án lệ mới</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {visibleCases.map((c, idx) => {
              const isOpen = expandedIds.has(c.id);
              const editable = canModify(c);
              const isHighlighted = highlightedId === c.id;

              return (
                <article
                  key={c.id}
                  id={`case-card-${c.id}`}
                  style={{
                    animationDelay: idx < 10 ? `${idx * 35}ms` : '0ms',
                  }}
                  className={`surface-card card-interactive ${
                    idx < 10 ? 'stagger-item' : ''
                  } ${isHighlighted ? 'highlight-target' : ''} p-5`}
                >
                  {/* Phần đầu thẻ bấm để mở rộng / thu gọn */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="serif text-xl font-semibold text-[var(--text-heading)] leading-snug group-hover:underline">
                        {c.name}
                      </h3>
                      <span className="text-xs font-semibold bg-[#0B1F3A] text-white dark:bg-[#1B3A6B] rounded px-2.5 py-1 shrink-0">
                        {c.court} · {c.year}
                      </span>
                    </div>

                    {!isOpen && (
                      <>
                        <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">
                          {c.facts}
                        </p>
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-[#1B3A6B] dark:text-sky-300 mt-2">
                          <span>Xem bản tóm tắt IRAC</span>
                          <ChevronDown className="w-4 h-4" />
                        </p>
                      </>
                    )}
                  </button>

                  {/* Nội dung mở rộng IRAC dùng grid-template-rows: 0fr -> 1fr */}
                  <div className="expand-grid" data-open={isOpen}>
                    <div className="expand-inner">
                      <div className="mt-4 pt-4 border-t border-[var(--border-card)] space-y-4">
                        <div>
                          <h4 className="serif text-base font-semibold text-[var(--text-heading)] mb-1">
                            Sự kiện (Facts)
                          </h4>
                          <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                            {c.facts}
                          </p>
                        </div>

                        <div>
                          <h4 className="serif text-base font-semibold text-[var(--text-heading)] mb-1">
                            Vấn đề pháp lý (Issues)
                          </h4>
                          <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                            {c.issues}
                          </p>
                        </div>

                        <div>
                          <h4 className="serif text-base font-semibold text-[var(--text-heading)] mb-1">
                            Lập luận &amp; Phán quyết (Holding / Reasoning)
                          </h4>
                          <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                            {c.holding}
                          </p>
                        </div>

                        <div>
                          <h4 className="serif text-base font-semibold text-[var(--text-heading)] mb-1">
                            Ý nghĩa pháp lý (Significance)
                          </h4>
                          <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                            {c.significance}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Từ khóa, Nguồn tham khảo ("Xem chi tiết"), Người đăng, và Nút thao tác */}
                  <div className="mt-3 space-y-3">
                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {c.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-card)] rounded px-2 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <SourcesAccordion sources={c.sources} />

                    <AuthorMeta
                      username={c.author_username}
                      role={c.author_role}
                      createdAt={c.created_at}
                      updatedAt={c.updated_at}
                    />

                    {(editable || isOpen) && (
                      <div className="flex flex-wrap gap-2">
                        {editable && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              className="btn-secondary text-xs py-1.5 px-3 min-h-[38px]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(c)}
                              className="btn-secondary text-xs py-1.5 px-3 min-h-[38px] text-red-700 dark:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </>
                        )}
                        {isOpen && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(c.id)}
                            className="btn-secondary text-xs py-1.5 px-3 min-h-[38px]"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Thu gọn</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {filteredCases.length > visibleCount && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="btn-secondary"
              >
                Xem thêm ({filteredCases.length - visibleCount} án lệ còn lại)
              </button>
            </div>
          )}
        </>
      )}

      {/* Hộp thoại Thêm / Sửa án lệ (IRAC) */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? 'Sửa án lệ' : 'Thêm án lệ mới'}
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="c-name"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Tên vụ việc <span className="text-red-600">*</span>
            </label>
            <input
              id="c-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Vụ Eo biển Corfu (Vương quốc Anh kiện Albania)"
              className="field-input"
              required
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="c-court"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Cơ quan tài phán <span className="text-red-600">*</span>
              </label>
              <input
                id="c-court"
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="ICJ, PCA, ITLOS, PCIJ..."
                className="field-input"
                required
              />
              {fieldErrors.court && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {fieldErrors.court}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="c-year"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Năm phán quyết (1500 – 2100) <span className="text-red-600">*</span>
              </label>
              <input
                id="c-year"
                type="number"
                min={1500}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ví dụ: 1949"
                className="field-input"
                required
              />
              {fieldErrors.year && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {fieldErrors.year}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="c-facts"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Tóm tắt sự kiện thực tế (Facts) <span className="text-red-600">*</span>
            </label>
            <textarea
              id="c-facts"
              rows={4}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              className="field-input"
              required
            />
            {fieldErrors.facts && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.facts}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="c-issues"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Vấn đề pháp lý tranh chấp (Legal Issues) <span className="text-red-600">*</span>
            </label>
            <textarea
              id="c-issues"
              rows={3}
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              placeholder="1. Vấn đề thứ nhất&#10;2. Vấn đề thứ hai"
              className="field-input"
              required
            />
            {fieldErrors.issues && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.issues}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="c-holding"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Lập luận của Tòa &amp; Phán quyết (Holding / Reasoning){' '}
              <span className="text-red-600">*</span>
            </label>
            <textarea
              id="c-holding"
              rows={5}
              value={holding}
              onChange={(e) => setHolding(e.target.value)}
              className="field-input"
              required
            />
            {fieldErrors.holding && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.holding}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="c-significance"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Ý nghĩa pháp lý (Significance) <span className="text-red-600">*</span>
            </label>
            <textarea
              id="c-significance"
              rows={3}
              value={significance}
              onChange={(e) => setSignificance(e.target.value)}
              className="field-input"
              required
            />
            {fieldErrors.significance && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.significance}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="c-tags"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Từ khóa (cách nhau bằng dấu phẩy, tùy chọn)
            </label>
            <input
              id="c-tags"
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Ví dụ: eo biển quốc tế, đi qua vô hại, ICJ"
              className="field-input"
            />
            {fieldErrors.tags && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.tags}
              </p>
            )}
          </div>

          <SourcesFieldEditor
            idPrefix="case"
            sources={sources}
            onChange={setSources}
            rowErrors={sourceRowErrors}
          />

          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[var(--border-card)]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Đang lưu...' : 'Lưu án lệ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Hộp xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa án lệ"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa án lệ "${deleteTarget.name}"? Thao tác này không thể hoàn tác.`
            : ''
        }
        loading={deleting}
      />
    </section>
  );
}
