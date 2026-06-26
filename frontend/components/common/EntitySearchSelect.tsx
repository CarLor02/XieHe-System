'use client';

import { useEffect, useMemo, useState } from 'react';
import AppDropdown from './AppDropdown';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export interface EntitySearchSelectPage<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EntitySearchSelectOptionView {
  primary: string;
  secondary?: string;
  meta?: string[];
}

export interface EntitySearchSelectLoadParams {
  page: number;
  pageSize: number;
  search?: string;
}

interface EntitySearchSelectProps<TItem> {
  value: string;
  selectedItem?: TItem | null;
  placeholder: string;
  searchPlaceholder: string;
  pageSize?: number;
  emptyText?: string;
  loadOptions: (
    params: EntitySearchSelectLoadParams
  ) => Promise<EntitySearchSelectPage<TItem>>;
  getOptionValue: (item: TItem) => string;
  mapOption: (item: TItem) => EntitySearchSelectOptionView;
  onChange: (value: string, item: TItem | null) => void;
  testIds?: {
    primary?: string;
    name?: string;
    secondary?: string;
  };
}

function selectedLabel<TItem>(
  selectedItem: TItem | null | undefined,
  placeholder: string,
  mapOption: (item: TItem) => EntitySearchSelectOptionView
) {
  if (!selectedItem) return placeholder;

  const view = mapOption(selectedItem);
  return view.secondary ? `${view.primary} / ${view.secondary}` : view.primary;
}

export default function EntitySearchSelect<TItem>({
  value,
  selectedItem,
  placeholder,
  searchPlaceholder,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyText = '暂无数据',
  loadOptions,
  getOptionValue,
  mapOption,
  onChange,
  testIds,
}: EntitySearchSelectProps<TItem>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [debouncedSearchKey, setDebouncedSearchKey] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSelectedItem, setLastSelectedItem] = useState<TItem | null>(null);

  const effectiveSelectedItem =
    selectedItem !== undefined ? selectedItem : lastSelectedItem;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchKey(searchKey.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchKey]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const trimmedSearchKey = debouncedSearchKey.trim();
        const result = await loadOptions({
          page,
          pageSize,
          ...(trimmedSearchKey ? { search: trimmedSearchKey } : {}),
        });

        if (cancelled) return;

        setItems(result.items);
        setTotalPages(Math.max(result.totalPages || 1, 1));
      } catch {
        if (cancelled) return;
        setItems([]);
        setTotalPages(1);
        setError('列表加载失败，请重试');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchKey, isOpen, loadOptions, page, pageSize, reloadKey]);

  const label = useMemo(
    () => selectedLabel(effectiveSelectedItem, placeholder, mapOption),
    [effectiveSelectedItem, mapOption, placeholder]
  );

  const handleSearchKeyChange = (nextSearchKey: string) => {
    setSearchKey(nextSearchKey);
    setPage(1);
  };

  const handleSelect = (item: TItem) => {
    setLastSelectedItem(item);
    onChange(getOptionValue(item), item);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLastSelectedItem(null);
    onChange('', null);
    setIsOpen(false);
    setSearchKey('');
    setDebouncedSearchKey('');
    setPage(1);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
  };

  return (
    <div
      data-testid="entity-search-select-control"
      className="flex min-w-0 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm text-gray-800 transition-colors hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500"
    >
      <AppDropdown
        open={isOpen}
        onOpenChange={handleOpenChange}
        align="start"
        contentClassName="w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 overflow-hidden"
        trigger={
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="flex h-10 min-w-0 flex-1 items-center justify-between gap-3 px-3 text-left focus:outline-none"
          >
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <i className="ri-arrow-down-s-line flex h-4 w-4 flex-shrink-0 items-center justify-center text-gray-400" />
          </button>
        }
      >
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-gray-400" />
              <input
                type="text"
                value={searchKey}
                onChange={event => handleSearchKeyChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key !== 'Escape') {
                    event.stopPropagation();
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div role="listbox" className="max-h-80 overflow-y-auto py-1">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                正在加载...
              </div>
            ) : error ? (
              <div className="space-y-3 px-4 py-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey(key => key + 1)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  重试
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              items.map(item => {
                const optionValue = getOptionValue(item);
                const view = mapOption(item);

                return (
                  <button
                    key={optionValue}
                    type="button"
                    role="option"
                    aria-selected={optionValue === value}
                    onClick={() => handleSelect(item)}
                    className="w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        data-testid={testIds?.primary}
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                      >
                        <div
                          data-testid={testIds?.name}
                          className="w-full truncate text-left text-sm font-medium text-gray-900"
                        >
                          {view.primary}
                        </div>
                        {view.secondary && (
                          <div
                            data-testid={testIds?.secondary}
                            className="mt-1 w-full text-left text-xs text-gray-500"
                          >
                            {view.secondary}
                          </div>
                        )}
                      </div>
                      {view.meta && view.meta.length > 0 && (
                        <div className="flex flex-shrink-0 gap-2 text-xs text-gray-500">
                          {view.meta.map(meta => (
                            <span key={meta}>{meta}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-nowrap items-center justify-center gap-4 border-t border-gray-100 px-3 py-2 text-sm text-gray-600">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(current => Math.max(1, current - 1))}
              className="flex-shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <span className="flex-shrink-0 whitespace-nowrap text-center">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              className="flex-shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
      </AppDropdown>
      {(value || effectiveSelectedItem) && (
        <button
          type="button"
          aria-label="清除选择"
          onClick={handleClear}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-l border-gray-300 text-gray-500 hover:bg-gray-50 focus:outline-none"
        >
          <i className="ri-close-line h-4 w-4" />
        </button>
      )}
    </div>
  );
}
