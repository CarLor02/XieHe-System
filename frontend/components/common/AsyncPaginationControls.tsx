'use client';

import { cn } from '@/lib/utils';

interface AsyncPaginationControlsProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function AsyncPaginationControls({
  page,
  totalPages,
  loading,
  onPageChange,
  className,
}: AsyncPaginationControlsProps) {
  const normalizedTotalPages = Math.max(totalPages, 1);
  const canGoPrevious = !loading && page > 1;
  const canGoNext = !loading && page < normalizedTotalPages;

  const changePage = (nextPage: number, enabled: boolean) => {
    if (!enabled) return;
    onPageChange(nextPage);
  };

  return (
    <div
      aria-busy={loading}
      className={cn(
        'flex flex-nowrap items-center justify-center gap-4 border-t border-gray-100 px-3 py-2 text-sm text-gray-600',
        className
      )}
    >
      <button
        type="button"
        aria-disabled={!canGoPrevious}
        onClick={() => changePage(page - 1, canGoPrevious)}
        className={cn(
          'flex-shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5',
          canGoPrevious
            ? 'text-gray-700 hover:bg-gray-50'
            : 'cursor-not-allowed text-gray-300'
        )}
      >
        上一页
      </button>
      <span
        aria-live="polite"
        className="flex-shrink-0 whitespace-nowrap text-center"
      >
        第 {page} / {normalizedTotalPages} 页
      </span>
      <button
        type="button"
        aria-disabled={!canGoNext}
        onClick={() => changePage(page + 1, canGoNext)}
        className={cn(
          'flex-shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5',
          canGoNext
            ? 'text-gray-700 hover:bg-gray-50'
            : 'cursor-not-allowed text-gray-300'
        )}
      >
        下一页
      </button>
    </div>
  );
}
