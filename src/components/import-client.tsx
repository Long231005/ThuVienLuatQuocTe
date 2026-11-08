'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FileJson,
  BookOpen,
  Scale,
} from 'lucide-react';
import { useToast } from '@/components/providers';
import { AI_IMPORT_PROMPT } from '@/lib/constants/import-prompt';
import {
  MAX_IMPORT_BYTES,
  validateImportJsonString,
  type ImportValidationResult,
} from '@/lib/schemas';
import { importBatchAction } from '@/app/actions/library';
import type { CaseRecord, TreatyRecord, UserProfile } from '@/lib/types';

interface ImportClientProps {
  profile: UserProfile;
  treaties: TreatyRecord[];
  cases: CaseRecord[];
}

export function ImportClient({ profile, treaties, cases }: ImportClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [validatedRawSnapshot, setValidatedRawSnapshot] = useState<string | null>(
    null
  );
  const [importing, setImporting] = useState(false);
  const [importSuccessInfo, setImportSuccessInfo] = useState<{
    total: number;
    treatiesCount: number;
    casesCount: number;
  } | null>(null);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
      showToast('Đã sao chép', 'success');
    } catch {
      showToast(
        'Trình duyệt không cho phép sao chép tự động. Hãy bấm mở khung prompt bên dưới và sao chép thủ công.',
        'error'
      );
      setShowPromptPreview(true);
    }
  };

  const handleReadFile = (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      showToast('File vượt quá giới hạn 5 MB. Vui lòng chia nhỏ file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setJsonInput(content);
      setValidationResult(null);
      setValidatedRawSnapshot(null);
      setImportSuccessInfo(null);
      showToast(`Đã đọc file "${file.name}". Bấm "Kiểm tra" để xem kết quả.`, 'success');
    };
    reader.onerror = () => {
      showToast('Không thể đọc file vừa chọn. Vui lòng thử lại.', 'error');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleReadFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleReadFile(file);
    }
  };

  const handleCheck = () => {
    setImportSuccessInfo(null);
    const result = validateImportJsonString(jsonInput);
    setValidationResult(result);
    if (result.valid) {
      setValidatedRawSnapshot(jsonInput);
    } else {
      setValidatedRawSnapshot(null);
    }
  };

  const isReadyToImport =
    Boolean(validationResult?.valid && validationResult.data) &&
    validatedRawSnapshot === jsonInput;

  const validTotalItems = validationResult?.data
    ? validationResult.data.treaties.length + validationResult.data.cases.length
    : 0;

  const handleImportSubmit = async () => {
    if (!isReadyToImport) return;
    setImporting(true);
    const res = await importBatchAction(jsonInput);
    setImporting(false);

    if (!res.ok) {
      setValidationResult({
        valid: false,
        errors: res.errors,
        totalErrorsCount: res.totalErrorsCount,
        warnings: [],
        preview: { treatyNames: [], caseNames: [] },
      });
      setValidatedRawSnapshot(null);
      showToast(res.errors[0] || 'Không thể nhập dữ liệu.', 'error');
      return;
    }

    setImportSuccessInfo({
      total: res.totalInserted,
      treatiesCount: res.treatiesInserted,
      casesCount: res.casesInserted,
    });
    setJsonInput('');
    setValidationResult(null);
    setValidatedRawSnapshot(null);
    showToast(`Đã nhập ${res.totalInserted} bài`, 'success');
    router.refresh();
  };

  const handleExport = (mode: 'mine' | 'all') => {
    const selectedTreaties =
      mode === 'mine'
        ? treaties.filter((t) => t.author_id === profile.id)
        : treaties;
    const selectedCases =
      mode === 'mine'
        ? cases.filter((c) => c.author_id === profile.id)
        : cases;

    if (selectedTreaties.length + selectedCases.length === 0) {
      showToast(
        mode === 'mine'
          ? 'Bạn chưa có bài viết nào để xuất.'
          : 'Thư viện hiện chưa có bài viết nào để xuất.',
        'error'
      );
      return;
    }

    const exportObject = {
      schema_version: '1.0' as const,
      treaties: selectedTreaties.map((t) => ({
        name: t.name,
        category: t.category,
        date: t.date_text,
        content: t.content,
        tags: t.tags,
        sources: t.sources.map((s) => ({ title: s.title, url: s.url })),
      })),
      cases: selectedCases.map((c) => ({
        name: c.name,
        court: c.court,
        year: c.year,
        facts: c.facts,
        issues: c.issues,
        holding: c.holding,
        significance: c.significance,
        tags: c.tags,
        sources: c.sources.map((s) => ({ title: s.title, url: s.url })),
      })),
    };

    const jsonString = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = mode === 'mine' ? 'thu-vien-luat-cua-toi' : 'thu-vien-luat';
    const fileName = `${prefix}-${yyyy}-${mm}-${dd}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Đã tải xuống file ${fileName}`, 'success');
  };

  return (
    <section className="page-transition space-y-8">
      <div>
        <h2 className="serif text-2xl sm:text-3xl font-bold text-[var(--text-heading)]">
          Nhập / Xuất dữ liệu
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Nhập nhiều văn kiện và án lệ cùng lúc bằng AI hoặc sao lưu toàn bộ thư viện ra file .json
        </p>
      </div>

      {/* KHU VỰC A: KHUNG HƯỚNG DẪN "CÁCH NHẬP NHIỀU BÀI CÙNG LÚC" */}
      <div className="surface-card p-5 sm:p-7 space-y-5">
        <div className="space-y-2">
          <h3 className="serif text-xl sm:text-2xl font-semibold text-[var(--text-heading)]">
            Cách nhập nhiều bài cùng lúc
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Bạn có tài liệu (điều ước, bài giảng, phán quyết...) và muốn nhập nhiều bài một lần? Làm theo 7 bước sau, mất khoảng 3 phút:
          </p>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--bg-muted)] p-4 sm:p-5 rounded-lg border border-[var(--border-card)]">
          <li>Bấm &ldquo;Sao chép prompt cho AI&rdquo; bên dưới.</li>
          <li>
            Mở ChatGPT, Claude hoặc Gemini. Dán prompt vừa sao chép vào ô chat.
          </li>
          <li>
            Ngay bên dưới prompt, dán nội dung tài liệu của bạn (hoặc đính kèm file PDF/Word nếu AI cho phép), rồi gửi.
          </li>
          <li>
            AI sẽ trả về một khối chữ trong khung đen (code). Bấm nút Copy ở góc khung đó.
          </li>
          <li>
            Quay lại trang này, dán vào ô &ldquo;Dán nội dung JSON&rdquo; (hoặc lưu thành file .json rồi tải lên).
          </li>
          <li>
            Bấm &ldquo;Kiểm tra&rdquo;. Hệ thống sẽ cho bạn biết có bao nhiêu bài hợp lệ và chỉ ra chỗ nào sai.
          </li>
          <li>
            Nếu mọi thứ ổn, bấm &ldquo;Nhập X bài&rdquo;. Các bài nhập sẽ mang tên bạn là người đăng.
          </li>
        </ol>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--text-heading)]">
            Lưu ý quan trọng:
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>
              AI có thể viết sai hoặc bịa nội dung và đường link. Hãy đối chiếu với tài liệu gốc trước khi dùng để học, và chỉ giữ lại link nguồn mà bạn đã mở và thấy đúng.
            </li>
            <li>
              Mỗi lần chỉ nên đưa cho AI một lượng tài liệu vừa phải (khoảng 20 đến 30 bài). Nếu tài liệu dài, hãy chia nhỏ và nhập nhiều lần.
            </li>
            <li>
              Nếu AI trả lời bị cụt giữa chừng (thiếu dấu &#125; ở cuối), hãy nhắn: &ldquo;Hãy gửi lại toàn bộ JSON hoàn chỉnh&rdquo;. Đừng tự sửa tay các dấu ngoặc, dấu phẩy.
            </li>
            <li>
              Nếu hệ thống báo lỗi, sao chép nguyên thông báo lỗi, dán lại cho AI và nhờ: &ldquo;Hãy sửa JSON theo lỗi này và gửi lại toàn bộ&rdquo;.
            </li>
            <li>
              Hệ thống không chặn bài trùng. Trước khi nhập, hãy tìm xem bài đó đã có chưa. Nếu lỡ nhập nhầm, bạn có thể xóa các bài của chính mình.
            </li>
            <li>
              Mỗi lần nhập là &ldquo;tất cả hoặc không gì cả&rdquo;: có lỗi thì không bài nào được lưu.
            </li>
            <li>
              Muốn thêm ít bài, hãy dùng nút &ldquo;Thêm văn kiện&rdquo; hoặc &ldquo;Thêm án lệ&rdquo; ở các trang tương ứng.
            </li>
            <li>
              Bấm &ldquo;Tải file mẫu&rdquo; nếu muốn xem một file JSON hoàn chỉnh trông như thế nào.
            </li>
          </ul>
        </div>

        {/* Các nút hành động trong khung hướng dẫn */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="btn-primary"
          >
            <Copy className="w-4 h-4" />
            <span>Sao chép prompt cho AI</span>
          </button>

          <a
            href="/mau-import.json"
            download="mau-import.json"
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span>Tải file mẫu</span>
          </a>

          <button
            type="button"
            onClick={() => setShowPromptPreview((prev) => !prev)}
            aria-expanded={showPromptPreview}
            className="btn-secondary"
          >
            <span>{showPromptPreview ? 'Ẩn nội dung prompt' : 'Xem nội dung prompt mẫu'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showPromptPreview ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Khung mở rộng xem nội dung prompt mẫu */}
        <div className="expand-grid" data-open={showPromptPreview}>
          <div className="expand-inner">
            <div className="mt-2 p-4 rounded-lg bg-slate-900 text-slate-100 border border-slate-700">
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                {AI_IMPORT_PROMPT}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC B: KHU VỰC NHẬP */}
      <div className="surface-card p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="serif text-xl sm:text-2xl font-semibold text-[var(--text-heading)]">
            Khu vực nhập dữ liệu
          </h3>
          <div>
            <input
              ref={fileInputRef}
              id="json-file-upload"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
            >
              <Upload className="w-4 h-4" />
              <span>Hoặc chọn file .json</span>
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-3 transition ${
            dragActive
              ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
              : 'border-[var(--border-subtle)]'
          }`}
        >
          <label
            htmlFor="import-json-textarea"
            className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >
            Dán nội dung JSON (hoặc kéo thả file .json vào khung này)
          </label>
          <textarea
            id="import-json-textarea"
            rows={10}
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setImportSuccessInfo(null);
            }}
            placeholder='Dán nội dung JSON do AI trả về (kể cả có ```json ở đầu) vào đây...'
            className="field-input font-mono text-xs sm:text-sm"
          />
        </div>

        {/* Nút Kiểm tra & Nút Nhập X bài */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={importing}
            className="btn-secondary"
          >
            <FileJson className="w-4 h-4" />
            <span>Kiểm tra</span>
          </button>

          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!isReadyToImport || importing}
            className="btn-primary"
          >
            <span>
              {importing
                ? 'Đang nhập dữ liệu...'
                : isReadyToImport
                  ? `Nhập ${validTotalItems} bài`
                  : 'Nhập dữ liệu (Bấm Kiểm tra trước)'}
            </span>
          </button>
        </div>

        {/* Thông báo sau khi nhập thành công */}
        {importSuccessInfo && (
          <div
            role="status"
            className="p-4 sm:p-5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100 space-y-3"
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Đã nhập {importSuccessInfo.total} bài ({importSuccessInfo.treatiesCount} văn kiện,{' '}
                {importSuccessInfo.casesCount} án lệ) thành công!
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/treaties" className="btn-secondary text-xs">
                <BookOpen className="w-4 h-4" />
                <span>Xem danh sách Điều ước &amp; Tập quán</span>
              </Link>
              <Link href="/cases" className="btn-secondary text-xs">
                <Scale className="w-4 h-4" />
                <span>Xem Thư viện Án lệ</span>
              </Link>
            </div>
          </div>
        )}

        {/* Kết quả nút Kiểm tra */}
        {validationResult && (
          <div className="space-y-4">
            {validationResult.warnings.length > 0 && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200 text-xs space-y-1">
                <p className="font-semibold">Lưu ý nhẹ:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationResult.warnings.slice(0, 10).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.valid && validationResult.data ? (
              <div
                role="status"
                className="p-4 sm:p-5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100 space-y-3"
              >
                <div className="flex items-center gap-2 font-semibold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Hợp lệ: {validationResult.data.treaties.length} văn kiện,{' '}
                    {validationResult.data.cases.length} án lệ
                  </span>
                </div>

                {validationResult.preview.treatyNames.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase opacity-80">
                      Danh sách văn kiện sẽ nhập ({validationResult.preview.treatyNames.length}):
                    </p>
                    <ul className="list-decimal list-inside text-sm space-y-0.5">
                      {validationResult.preview.treatyNames.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.preview.caseNames.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase opacity-80">
                      Danh sách án lệ sẽ nhập ({validationResult.preview.caseNames.length}):
                    </p>
                    <ul className="list-decimal list-inside text-sm space-y-0.5">
                      {validationResult.preview.caseNames.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div
                role="alert"
                className="p-4 sm:p-5 rounded-lg bg-red-50 border border-red-300 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-100 space-y-3"
              >
                <div className="flex items-center gap-2 font-semibold text-base">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                  <span>
                    Phát hiện {validationResult.totalErrorsCount} lỗi cần sửa trước khi nhập:
                  </span>
                </div>
                <ul className="list-disc list-inside text-sm space-y-1.5 leading-relaxed">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                {validationResult.totalErrorsCount > validationResult.errors.length && (
                  <p className="text-xs font-semibold pt-1">
                    ...và{' '}
                    {validationResult.totalErrorsCount - validationResult.errors.length}{' '}
                    lỗi khác.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* KHU VỰC 8.4: XUẤT DỮ LIỆU (SAO LƯU) */}
      <div className="surface-card p-5 sm:p-7 space-y-4">
        <div>
          <h3 className="serif text-xl sm:text-2xl font-semibold text-[var(--text-heading)]">
            Xuất dữ liệu
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Nên xuất một bản sao lưu định kỳ. File .json tải về có thể nhập lại bất cứ lúc nào bằng chính khu vực nhập ở trên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleExport('mine')}
            className="btn-secondary"
          >
            <Download className="w-4 h-4" />
            <span>Xuất bài của tôi</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('all')}
            className="btn-primary"
          >
            <Download className="w-4 h-4" />
            <span>Xuất tất cả bài</span>
          </button>
        </div>
      </div>
    </section>
  );
}
