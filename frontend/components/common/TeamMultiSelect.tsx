'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TeamSummary } from '@/services/teamService';
import { cn } from '@/lib/utils';
import AppDropdown from './AppDropdown';

export interface TeamMultiSelectLoadParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface TeamMultiSelectPage {
  items: TeamSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TeamMultiSelectProps {
  selectedIds: number[];
  onChange: (teamIds: number[]) => void;
  loadOptions: (params: TeamMultiSelectLoadParams) => Promise<TeamMultiSelectPage>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  pageSize?: number;
  dropdownContentClassName?: string;
}

export default function TeamMultiSelect({
  selectedIds,
  onChange,
  loadOptions,
  placeholder = '选择归属团队',
  searchPlaceholder = '搜索团队名',
  emptyText = '暂无可选团队',
  pageSize = 10,
  dropdownContentClassName,
}: TeamMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleTeam = (teamId: number) => {
    const next = new Set(selectedIds);
    if (next.has(teamId)) {
      next.delete(teamId);
    } else {
      next.add(teamId);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const params: TeamMultiSelectLoadParams = { page, pageSize };
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    loadOptions(params)
      .then(result => {
        if (cancelled) return;
        setTeams(result.items ?? []);
        setTotalPages(Math.max(result.totalPages || 1, 1));
      })
      .catch(() => {
        if (cancelled) return;
        setTeams([]);
        setTotalPages(1);
        setError('团队列表加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, loadOptions, open, page, pageSize, reloadKey]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (open) {
      setLoading(true);
      setError(null);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLoading(true);
      setError(null);
    }
    setOpen(nextOpen);
  };

  const handlePageChange = (nextPage: number) => {
    setLoading(true);
    setError(null);
    setPage(nextPage);
  };

  const label =
    selectedIds.length === 0 ? placeholder : `已选择 ${selectedIds.length} 个团队`;

  return (
    <div className="flex min-w-0 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm text-gray-800 transition-colors hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500">
      <AppDropdown
        open={open}
        onOpenChange={handleOpenChange}
        align="start"
        contentClassName={cn(
          'w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 overflow-hidden',
          dropdownContentClassName
        )}
        trigger={
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => {
              if (!open) {
                handleOpenChange(true);
              }
            }}
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
                value={search}
                onChange={event => handleSearchChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key !== 'Escape') {
                    event.stopPropagation();
                  }
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                正在加载...
              </div>
            ) : error ? (
              <div className="px-4 py-5 text-center text-sm text-red-600">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    setReloadKey(value => value + 1);
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-700"
                >
                  重试
                </button>
              </div>
            ) : teams.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              teams.map(team => (
                <label
                  key={team.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(team.id)}
                    onChange={() => toggleTeam(team.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-900">
                    {team.name}
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-sm text-gray-600">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => handlePageChange(Math.max(page - 1, 1))}
              className="flex-shrink-0 whitespace-nowrap rounded px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              上一页
            </button>
            <span className="flex-shrink-0 whitespace-nowrap">
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="flex-shrink-0 whitespace-nowrap rounded px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              下一页
            </button>
          </div>
      </AppDropdown>
      {selectedIds.length > 0 && (
        <button
          type="button"
          aria-label="清除团队选择"
          onClick={() => onChange([])}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-l border-gray-300 text-gray-500 hover:bg-gray-50 focus:outline-none"
        >
          <i className="ri-close-line h-4 w-4" />
        </button>
      )}
    </div>
  );
}
