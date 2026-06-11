'use client';

import { useEffect, useState } from 'react';

import { getPatients, type Patient } from '@/services/patientServices';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface PatientSearchSelectProps {
  value: string;
  onChange: (patientId: string) => void;
}

function formatPhone(patient: Patient) {
  return patient.phone?.trim() || '未提供';
}

function formatGender(patient: Patient) {
  return patient.gender?.trim() || '未知';
}

function formatAge(patient: Patient) {
  return patient.age !== null && patient.age !== undefined
    ? `${patient.age}岁`
    : '未知';
}

function getPatientSearchKey(patient: Patient) {
  return `${patient.name}:${formatPhone(patient)}`;
}

export default function PatientSearchSelect({
  value,
  onChange,
}: PatientSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [debouncedSearchKey, setDebouncedSearchKey] = useState('');
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!value) {
      setSelectedPatient(null);
    }
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchKey(searchKey.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchKey]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadPatients = async () => {
      setLoading(true);
      setError('');
      try {
        const trimmedSearchKey = debouncedSearchKey.trim();
        const result = await getPatients({
          page,
          page_size: PAGE_SIZE,
          ...(trimmedSearchKey ? { search: trimmedSearchKey } : {}),
        });

        if (cancelled) return;

        setPatients(result.items);
        setTotalPages(Math.max(result.totalPages || 1, 1));
      } catch {
        if (cancelled) return;
        setPatients([]);
        setTotalPages(1);
        setError('患者列表加载失败，请重试');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPatients();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchKey, isOpen, page, reloadKey]);

  const handleSearchKeyChange = (nextSearchKey: string) => {
    setSearchKey(nextSearchKey);
    setPage(1);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    onChange(String(patient.id));
    setIsOpen(false);
  };

  const selectedLabel = selectedPatient
    ? `${selectedPatient.name} / ${formatPhone(selectedPatient)}`
    : '请选择患者';

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(open => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <i className="ri-arrow-down-s-line flex h-5 w-5 flex-shrink-0 items-center justify-center text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-gray-400" />
              <input
                type="text"
                value={searchKey}
                onChange={event => handleSearchKeyChange(event.target.value)}
                placeholder="搜索患者姓名或手机号"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div role="listbox" className="max-h-80 overflow-y-auto py-1">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                正在加载患者...
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
            ) : patients.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                暂无患者
              </div>
            ) : (
              patients.map(patient => (
                <button
                  key={patient.id}
                  type="button"
                  role="option"
                  aria-selected={String(patient.id) === value}
                  data-search-key={getPatientSearchKey(patient)}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      data-testid="patient-option-primary"
                      className="flex min-w-0 flex-1 flex-col items-start text-left"
                    >
                      <div
                        data-testid="patient-option-name"
                        className="w-full truncate text-left text-sm font-medium text-gray-900"
                      >
                        {patient.name}
                      </div>
                      <div
                        data-testid="patient-option-phone"
                        className="mt-1 w-full text-left text-xs text-gray-500"
                      >
                        手机号：{formatPhone(patient)}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-2 text-xs text-gray-500">
                      <span>{formatGender(patient)}</span>
                      <span>{formatAge(patient)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 text-sm text-gray-600">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(current => Math.max(1, current - 1))}
              className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <span>
              第 {page} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
