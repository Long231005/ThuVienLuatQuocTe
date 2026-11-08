import type { SourceCategory } from '@/lib/schemas';

export const BADGE_STYLES: Record<SourceCategory, string> = {
  'Điều ước quốc tế':
    'bg-blue-100 text-blue-900 dark:bg-blue-950/90 dark:text-blue-200 dark:border dark:border-blue-800/70',
  'Tập quán quốc tế':
    'bg-amber-100 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200 dark:border dark:border-amber-800/70',
  'Nguyên tắc pháp lý chung':
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border dark:border-emerald-800/70',
};
