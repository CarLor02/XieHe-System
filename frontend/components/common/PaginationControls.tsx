'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const displayedPageInput = pageInput ?? String(normalizedCurrentPage);

  const stepPageInput = (step: -1 | 1) => {
    const parsedPage = Number(displayedPageInput);
    const basePage = Number.isInteger(parsedPage)
      ? parsedPage
      : normalizedCurrentPage;
    setPageInput(
      String(
        Math.min(normalizedTotalPages, Math.max(1, basePage + step))
      )
    );
  };

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

      <div className="flex items-center gap-1 whitespace-nowrap text-sm text-gray-700">
        <span>第</span>
        <div className="flex h-8 overflow-hidden rounded border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input
            type="text"
            role="spinbutton"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={pageInputLabel}
            aria-valuemin={1}
            aria-valuemax={normalizedTotalPages}
            aria-valuenow={
              Number.isInteger(Number(displayedPageInput))
                ? Number(displayedPageInput)
                : undefined
            }
            value={displayedPageInput}
            onChange={event => {
              if (/^\d*$/.test(event.target.value)) {
                setPageInput(event.target.value);
              }
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                confirmPageInput();
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                stepPageInput(1);
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                stepPageInput(-1);
              }
            }}
            className="w-12 border-0 px-2 text-center text-sm outline-none"
          />
          <div className="flex w-6 flex-col border-l border-gray-300">
            <button
              type="button"
              aria-label={`${pageInputLabel}增加一页`}
              onClick={() => stepPageInput(1)}
              className="flex min-h-0 flex-1 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              <ChevronUp aria-hidden="true" size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label={`${pageInputLabel}减少一页`}
              onClick={() => stepPageInput(-1)}
              className="flex min-h-0 flex-1 items-center justify-center border-t border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              <ChevronDown aria-hidden="true" size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <span>/ {normalizedTotalPages} 页</span>
      </div>

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
