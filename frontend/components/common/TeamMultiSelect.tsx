'use client';

import { useMemo, useState } from 'react';
import type { TeamSummary } from '@/services/teamService';

interface TeamMultiSelectProps {
  teams: TeamSummary[];
  selectedIds: number[];
  onChange: (teamIds: number[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

export default function TeamMultiSelect({
  teams,
  selectedIds,
  onChange,
  placeholder = '选择归属团队',
  searchPlaceholder = '搜索团队名',
  emptyText = '暂无可选团队',
}: TeamMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedTeams = teams.filter(team => selectedSet.has(team.id));
  const visibleTeams = teams.filter(team =>
    team.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggleTeam = (teamId: number) => {
    const next = new Set(selectedIds);
    if (next.has(teamId)) {
      next.delete(teamId);
    } else {
      next.add(teamId);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  const label =
    selectedTeams.length === 0
      ? placeholder
      : selectedTeams.map(team => team.name).join('、');

  return (
    <div className="relative">
      <div className="flex min-w-0 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm text-gray-800 transition-colors hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen(value => !value)}
          className="flex h-10 min-w-0 flex-1 items-center justify-between gap-3 px-3 text-left focus:outline-none"
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <i className="ri-arrow-down-s-line flex h-4 w-4 flex-shrink-0 items-center justify-center text-gray-400" />
        </button>
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

      {selectedTeams.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedTeams.map(team => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              {team.name}
              <button
                type="button"
                aria-label={`移除${team.name}`}
                onClick={() => toggleTeam(team.id)}
                className="text-blue-500 hover:text-blue-700"
              >
                <i className="ri-close-line" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-gray-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto py-1">
            {visibleTeams.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              visibleTeams.map(team => (
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
        </div>
      )}
    </div>
  );
}
