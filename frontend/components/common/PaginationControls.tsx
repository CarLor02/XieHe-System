'use client';

import { useState } from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  directPageCount?: number;
  pageInputLabel?: string;
}

/**
 * 提供固定数量的直接页码与任意页跳转输入框。
 * 直接页码按区间滚动，例如每组 10 页时依次显示 1-10、11-20。
 */
export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  directPageCount = 10,
  pageInputLabel = '页码',
}: PaginationControlsProps) {
  const normalizedTotalPages = Math.max(1, Math.floor(totalPages));
  const normalizedCurrentPage = Math.min(
    normalizedTotalPages,
    Math.max(1, Math.floor(currentPage))
  );
  const normalizedDirectPageCount = Math.max(1, Math.floor(directPageCount));
  const windowStart =
    Math.floor((normalizedCurrentPage - 1) / normalizedDirectPageCount) *
      normalizedDirectPageCount +
    1;
  const windowEnd = Math.min(
    normalizedTotalPages,
    windowStart + normalizedDirectPageCount - 1
  );
  const directPages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, index) => windowStart + index
  );
  const [pageInput, setPageInput] = useState<string | null>(null);

  const changePage = (page: number) => {
    setPageInput(null);
    onPageChange(page);
  };

  const confirmPageInput = () => {
    const requestedPage = Number(pageInput ?? normalizedCurrentPage);
    if (
      !Number.isInteger(requestedPage) ||
      requestedPage < 1 ||
      requestedPage > normalizedTotalPages
    ) {
      changePage(1);
      return;
    }

    changePage(requestedPage);
  };

  return (
    <div className="flex min-w-max items-center gap-2">
      <button
        type="button"
        onClick={() => changePage(normalizedCurrentPage - 1)}
        disabled={normalizedCurrentPage === 1}
        className="whitespace-nowrap rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        上一页
      </button>

      <div className="flex items-center gap-1">
        {directPages.map(page => (
          <button
            key={page}
            type="button"
            aria-current={normalizedCurrentPage === page ? 'page' : undefined}
            onClick={() => changePage(page)}
            className={`min-w-9 rounded border px-2 py-1 text-sm ${
              normalizedCurrentPage === page
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-1 whitespace-nowrap text-sm text-gray-700">
        <span>第</span>
        <input
          type="number"
          min={1}
          max={normalizedTotalPages}
          step={1}
          inputMode="numeric"
          aria-label={pageInputLabel}
          value={pageInput ?? String(normalizedCurrentPage)}
          onChange={event => setPageInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              confirmPageInput();
            }
          }}
          className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span>/ {normalizedTotalPages} 页</span>
      </label>

      <button
        type="button"
        onClick={() => changePage(normalizedCurrentPage + 1)}
        disabled={normalizedCurrentPage === normalizedTotalPages}
        className="whitespace-nowrap rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        下一页
      </button>
    </div>
  );
}
