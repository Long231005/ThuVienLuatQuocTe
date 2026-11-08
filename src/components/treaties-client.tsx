'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useDisplayScope, useToast } from '@/components/providers';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AuthorMeta } from '@/components/author-meta';
import { SourcesAccordion } from '@/components/sources-accordion';
import {
  SourcesFieldEditor,
  type SourceRowError,
} from '@/components/sources-field-editor';
import {
  SOURCE_CATEGORIES,
  treatyInputSchema,
  type SourceCategory,
  type SourceLink,
} from '@/lib/schemas';
import { BADGE_STYLES } from '@/lib/constants/badges';
import { normalizeForSearch } from '@/lib/utils/normalize';
import { deleteTreatyAction, saveTreatyAction } from '@/app/actions/library';
import type { TreatyRecord, UserProfile } from '@/lib/types';

interface TreatiesClientProps {
  profile: UserProfile;
  initialTreaties: TreatyRecord[];
  errorMessage: string | null;
  openId: string | null;
}

const PAGE_SIZE = 30;

export function TreatiesClient({
  profile,
  initialTreaties,
  errorMessage,
  openId,
}: TreatiesClientProps) {
  const router = useRouter();
  const { scope } = useDisplayScope();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [highlightedId, setHighlightedId] = useState<string | null>(openId);

  // Trạng thái hộp thoại thêm/sửa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SourceCategory>(SOURCE_CATEGORIES[0]);
  const [dateText, setDateText] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [sources, setSources] = useState<SourceLink[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sourceRowErrors, setSourceRowErrors] = useState<
    Record<number, SourceRowError>
  >({});
  const [saving, setSaving] = useState(false);

  // Trạng thái hộp xác nhận xóa
  const [deleteTarget, setDeleteTarget] = useState<TreatyRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scopedTreaties = useMemo(() => {
    if (scope === 'mine') {
      return initialTreaties.filter(
        (t) => t.author_id === profile.id || (openId && t.id === openId)
      );
    }
    return initialTreaties;
  }, [initialTreaties, scope, profile.id, openId]);

  const normalizedQuery = useMemo(
    () => normalizeForSearch(searchQuery),
    [searchQuery]
  );

  const filteredTreaties = useMemo(() => {
    return scopedTreaties.filter((t) => {
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeForSearch(
        [t.name, t.tags.join(' '), t.content, t.date_text, t.author_username].join(' ')
      );
      return haystack.includes(normalizedQuery);
    });
  }, [scopedTreaties, categoryFilter, normalizedQuery]);

  const effectiveVisibleCount = useMemo(() => {
    if (!openId) return visibleCount;
    const idx = filteredTreaties.findIndex((t) => t.id === openId);
    if (idx >= visibleCount) return idx + 10;
    return visibleCount;
  }, [openId, filteredTreaties, visibleCount]);

  // Cuộn tới và làm nổi bật khi mở từ tìm kiếm toàn văn (?open=<id>)
  useEffect(() => {
    if (!openId) return;
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`treaty-card-${openId}`);
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

  const visibleTreaties = useMemo(
    () => filteredTreaties.slice(0, effectiveVisibleCount),
    [filteredTreaties, effectiveVisibleCount]
  );

  const canModify = (item: TreatyRecord) =>
    profile.role === 'admin' || item.author_id === profile.id;

  const openAddModal = () => {
    setEditingId(undefined);
    setName('');
    setCategory(SOURCE_CATEGORIES[0]);
    setDateText('');
    setContent('');
    setTagsText('');
    setSources([]);
    setFieldErrors({});
    setSourceRowErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item: TreatyRecord) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setDateText(item.date_text);
    setContent(item.content);
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

    // Bỏ qua các dòng nguồn mà người dùng để trống cả tiêu đề lẫn URL
    const nonEmptySources = sources.filter(
      (s) => s.title.trim().length > 0 || s.url.trim().length > 0
    );

    const rawCandidate = {
      name,
      category,
      date: dateText,
      content,
      tags: tagsText,
      sources: nonEmptySources,
    };

    const parsed = treatyInputSchema.safeParse(rawCandidate);
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
    const res = await saveTreatyAction(parsed.data, editingId);
    setSaving(false);

    if (!res.ok) {
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      showToast(res.error || 'Không thể lưu văn kiện.', 'error');
      return;
    }

    setModalOpen(false);
    showToast(
      editingId ? 'Đã cập nhật văn kiện thành công.' : 'Đã thêm văn kiện mới.',
      'success'
    );
    router.refresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteTreatyAction(deleteTarget.id);
    setDeleting(false);

    if (!res.ok) {
      showToast(res.error || 'Không thể xóa văn kiện.', 'error');
      return;
    }

    setDeleteTarget(null);
    showToast('Đã xóa văn kiện.', 'success');
    router.refresh();
  };

  return (
    <section className="page-transition space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="serif text-2xl sm:text-3xl font-bold text-[var(--text-heading)]">
            Điều ước &amp; Tập quán quốc tế
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Hiển thị {filteredTreaties.length} văn kiện (
            {scope === 'all' ? 'Tất cả bài' : 'Bài của tôi'})
          </p>
        </div>
        <button type="button" onClick={openAddModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>Thêm văn kiện</span>
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

      {/* Thanh tìm kiếm & lọc */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="treaty-search"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Tìm theo tên hoặc từ khóa"
            aria-label="Tìm văn kiện"
            className="field-input pl-10"
          />
        </div>

        <select
          id="treaty-filter"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          aria-label="Lọc theo phân loại nguồn"
          className="field-input w-full sm:w-72"
        >
          <option value="">Tất cả phân loại nguồn</option>
          {SOURCE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Danh sách thẻ văn kiện */}
      {filteredTreaties.length === 0 ? (
        <div className="surface-card p-8 text-center space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Không tìm thấy văn kiện phù hợp. Thử đổi từ khóa, đổi bộ lọc hoặc bấm &ldquo;Thêm văn kiện&rdquo;.
          </p>
          <div>
            <button type="button" onClick={openAddModal} className="btn-secondary">
              <Plus className="w-4 h-4" />
              <span>Thêm văn kiện mới</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleTreaties.map((t, idx) => {
              const editable = canModify(t);
              const isHighlighted = highlightedId === t.id;
              return (
                <article
                  key={t.id}
                  id={`treaty-card-${t.id}`}
                  style={{
                    animationDelay: idx < 10 ? `${idx * 35}ms` : '0ms',
                  }}
                  className={`surface-card card-interactive ${
                    idx < 10 ? 'stagger-item' : ''
                  } ${
                    isHighlighted ? 'highlight-target' : ''
                  } p-5 flex flex-col justify-between gap-3`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="serif text-xl font-semibold text-[var(--text-heading)] leading-snug">
                        {t.name}
                      </h3>
                      <span
                        className={`text-xs font-medium rounded px-2.5 py-1 shrink-0 ${
                          BADGE_STYLES[t.category]
                        }`}
                      >
                        {t.category}
                      </span>
                    </div>

                    <p className="text-sm text-[var(--text-muted)]">{t.date_text}</p>

                    <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--text-primary)]">
                      {t.content}
                    </p>

                    {t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-card)] rounded px-2 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Nút Xem chi tiết (ẩn hẳn nếu bài không có nguồn tham khảo) */}
                    <SourcesAccordion sources={t.sources} />
                  </div>

                  <div className="space-y-3 mt-2">
                    <AuthorMeta
                      username={t.author_username}
                      role={t.author_role}
                      createdAt={t.created_at}
                      updatedAt={t.updated_at}
                    />

                    {editable && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="btn-secondary text-xs py-1.5 px-3 min-h-[38px]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="btn-secondary text-xs py-1.5 px-3 min-h-[38px] text-red-700 dark:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {filteredTreaties.length > visibleCount && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="btn-secondary"
              >
                Xem thêm ({filteredTreaties.length - visibleCount} văn kiện còn lại)
              </button>
            </div>
          )}
        </>
      )}

      {/* Hộp thoại Thêm / Sửa văn kiện */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? 'Sửa văn kiện' : 'Thêm văn kiện mới'}
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="t-name"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Tên văn kiện / Nguyên tắc <span className="text-red-600">*</span>
            </label>
            <input
              id="t-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Công ước Liên hợp quốc về Luật Biển 1982 (UNCLOS)"
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
                htmlFor="t-category"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Phân loại nguồn <span className="text-red-600">*</span>
              </label>
              <select
                id="t-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SourceCategory)}
                className="field-input"
              >
                {SOURCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {fieldErrors.category}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="t-date"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Ngày hiệu lực / Kỷ nguyên hình thành <span className="text-red-600">*</span>
              </label>
              <input
                id="t-date"
                type="text"
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                placeholder="Ví dụ: Ký ngày 10/12/1982; có hiệu lực từ 16/11/1994"
                className="field-input"
                required
              />
              {fieldErrors.date && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {fieldErrors.date}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="t-content"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Nội dung cốt lõi <span className="text-red-600">*</span>
            </label>
            <textarea
              id="t-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Trình bày nội dung pháp lý cốt lõi, các điều khoản quan trọng..."
              className="field-input"
              required
            />
            {fieldErrors.content && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.content}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="t-tags"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              Từ khóa (cách nhau bằng dấu phẩy, tùy chọn)
            </label>
            <input
              id="t-tags"
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Ví dụ: luật biển, UNCLOS, vùng đặc quyền kinh tế"
              className="field-input"
            />
            {fieldErrors.tags && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.tags}
              </p>
            )}
          </div>

          <SourcesFieldEditor
            idPrefix="treaty"
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
              {saving ? 'Đang lưu...' : 'Lưu văn kiện'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Hộp xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa văn kiện"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa văn kiện "${deleteTarget.name}"? Thao tác này không thể hoàn tác.`
            : ''
        }
        loading={deleting}
      />
    </section>
  );
}
