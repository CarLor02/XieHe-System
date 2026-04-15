'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import {
  createPatient,
  getPatients,
} from '@/services/patientServices';
import { uploadSingleFile } from '@/services/imageServices';
import {
  downloadSyncPreviewImage,
  getSyncFiles,
  getSyncStats,
  inspectSyncFile,
  markSyncFileSynced,
  type SyncServiceConfig,
} from '@/services/syncServices';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ScanFile {
  id: number;
  month_folder: string;
  patient_folder: string;
  filename: string;
  file_path: string;
  file_size: number;
  is_primary: boolean;
  is_valid: boolean;
  is_synced: boolean;
  synced_at: string | null;
}

interface Stats {
  total: number;
  valid: number;
  primary: number;
  synced: number;
  unsynced_primary: number;
}

type ImportStatus = 'idle' | 'inspecting' | 'patient' | 'downloading' | 'uploading' | 'marking' | 'done' | 'error';

interface ImportState {
  status: ImportStatus;
  message: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const LS_URL_KEY = 'sync_service_url';
const LS_KEY_KEY = 'sync_api_key';

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseDicomDate(s: string | null | undefined): string | null {
  if (!s || s.length < 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function mapGender(sex: string | null | undefined): string {
  if (!sex) return '未知';
  const s = sex.toUpperCase();
  if (s === 'M' || s === 'MALE' || s === '男') return '男';
  if (s === 'F' || s === 'FEMALE' || s === '女') return '女';
  return '未知';
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SyncPage() {
  const [serviceUrl, setServiceUrl] = useState('http://localhost:9000');
  const [apiKey, setApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const [files, setFiles] = useState<ScanFile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterSynced, setFilterSynced] = useState('false'); // 'all'|'true'|'false'
  const [filterPatient, setFilterPatient] = useState('');
  const [months, setMonths] = useState<string[]>([]);
  const [patients, setPatients] = useState<string[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Import progress per file
  const [importStates, setImportStates] = useState<Record<number, ImportState>>({});
  const [importing, setImporting] = useState(false);

  // Toast
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const url = localStorage.getItem(LS_URL_KEY);
    const key = localStorage.getItem(LS_KEY_KEY);
    if (url) setServiceUrl(url);
    if (key) setApiKey(key);
  }, []);

  const syncConfig = useCallback<() => SyncServiceConfig>(() => ({
    serviceUrl,
    apiKey,
  }), [serviceUrl, apiKey]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const statsData = await getSyncStats(syncConfig());
      setStats({
        total: statsData.total_files ?? 0,
        valid: statsData.valid_files ?? 0,
        primary: statsData.primary_files ?? 0,
        synced: statsData.synced_files ?? 0,
        unsynced_primary: statsData.unsynced_primary ?? 0,
      });

      // months list
      const monthsSet = new Set<string>();
      const patientsSet = new Set<string>();

      // files
      const params = new URLSearchParams({ page: '1', page_size: '200', is_primary: 'true' });
      if (filterMonth) params.set('month', filterMonth);
      if (filterSynced !== 'all') params.set('is_synced', filterSynced);
      if (filterPatient) params.set('patient_folder', filterPatient);

      const items = await getSyncFiles(syncConfig(), params);
      setFiles(items);
      items.forEach(f => { monthsSet.add(f.month_folder); patientsSet.add(f.patient_folder); });
      setMonths(Array.from(monthsSet).sort());
      setPatients(Array.from(patientsSet).sort());
    } catch (e: unknown) {
      setError(`连接失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [syncConfig, filterMonth, filterSynced, filterPatient]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  const saveConfig = () => {
    localStorage.setItem(LS_URL_KEY, serviceUrl);
    localStorage.setItem(LS_KEY_KEY, apiKey);
    setShowConfig(false);
    loadData();
  };

  // ── Import Logic ─────────────────────────────────────────────────────────────

  const setFileImportState = (id: number, status: ImportStatus, message: string) => {
    setImportStates(prev => ({ ...prev, [id]: { status, message } }));
  };

  const importFile = async (file: ScanFile) => {
    setFileImportState(file.id, 'inspecting', '读取DICOM元数据…');

    // 1. Inspect
    const inspectData = await inspectSyncFile(syncConfig(), file.id);
    const dicom = inspectData.dicom ?? {};

    const patientName = dicom.PatientName || file.patient_folder;
    const patientIdRaw = dicom.PatientID || file.patient_folder;
    const gender = mapGender(dicom.PatientSex);
    const birthDate = parseDicomDate(dicom.PatientBirthDate);

    // 2. 按 patient_id 查找患者，找不到才创建
    setFileImportState(file.id, 'patient', '查找/创建患者…');
    let mainPatientId: number | null = null;

    // 先按 patient_id 搜索，找到直接关联，找不到才创建
    const searchRes = await getPatients({
      search: patientIdRaw,
      page_size: 20,
    });
    const patientList = searchRes.items;
    const existing = patientList.find(p => p.patient_id === patientIdRaw);

    if (existing) {
      mainPatientId = existing.id;
    } else {
      const createRes = await createPatient({
        patient_id: patientIdRaw,
        name: patientName,
        gender,
        birth_date: birthDate || undefined,
      });
      mainPatientId = createRes.id ?? null;
    }

    if (!mainPatientId) throw new Error('无法创建或找到患者');

    // 3. 从索引服务获取转换好的 PNG 图像
    setFileImportState(file.id, 'downloading', '转换图像…');
    const rawBlob = await downloadSyncPreviewImage(syncConfig(), file.id);

    const uploadFilename = `${file.filename}.png`;
    const dicomBlob = new Blob([rawBlob], { type: 'image/png' });

    // 4. Upload to main backend
    setFileImportState(file.id, 'uploading', '上传到系统…');
    await uploadSingleFile({
      file: new File([dicomBlob], uploadFilename, { type: 'image/png' }),
      patient_id: String(mainPatientId),
      description: `DICOM导入 ${file.month_folder}/${file.patient_folder}`,
    });

    // 5. Mark synced
    setFileImportState(file.id, 'marking', '标记已同步…');
    await markSyncFileSynced(syncConfig(), file.id);

    setFileImportState(file.id, 'done', '导入成功');
  };

  const importSelected = async () => {
    if (!selectedIds.size) return;
    setImporting(true);
    const ids = Array.from(selectedIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      const file = files.find(f => f.id === id);
      if (!file) continue;
      try {
        await importFile(file);
        ok++;
      } catch (e: unknown) {
        setFileImportState(id, 'error', (e as Error).message);
        fail++;
      }
    }
    setImporting(false);
    showToast(`导入完成：成功 ${ok} 个${fail ? `，失败 ${fail} 个` : ''}`);
    setSelectedIds(new Set());
    void loadData();
  };

  // ── Selection helpers ─────────────────────────────────────────────────────

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(files.filter(f => !f.is_synced && f.is_valid).map(f => f.id)));
  const clearSel = () => setSelectedIds(new Set());

  // ── Status badge ──────────────────────────────────────────────────────────

  const importStateFor = (id: number): ImportState | null => importStates[id] ?? null;

  const statusBadge = (f: ScanFile) => {
    const s = importStateFor(f.id);
    if (s) {
      const colors: Record<ImportStatus, string> = {
        idle: 'bg-gray-100 text-gray-600',
        inspecting: 'bg-blue-100 text-blue-700',
        patient: 'bg-purple-100 text-purple-700',
        downloading: 'bg-yellow-100 text-yellow-700',
        uploading: 'bg-orange-100 text-orange-700',
        marking: 'bg-teal-100 text-teal-700',
        done: 'bg-green-100 text-green-700',
        error: 'bg-red-100 text-red-700',
      };
      return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[s.status]}`}>{s.message}</span>;
    }
    if (f.is_synced) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">已同步</span>;
    if (!f.is_valid) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">文件丢失</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">待导入</span>;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className="ml-64 p-6">

          {/* Page title + Config toggle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">同步数据</h1>
              <p className="text-sm text-gray-500 mt-0.5">从本地文件索引服务导入DICOM影像到系统</p>
            </div>
            <button
              onClick={() => setShowConfig(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <i className="ri-settings-3-line"></i> 服务配置
            </button>
          </div>

          {/* Config panel */}
          {showConfig && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-500 mb-1">文件索引服务地址</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={serviceUrl}
                  onChange={e => setServiceUrl(e.target.value)}
                  placeholder="http://localhost:9000"
                />
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-gray-500 mb-1">API Key（可选）</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="your-api-key"
                  type="password"
                />
              </div>
              <button
                onClick={saveConfig}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                连接并刷新
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4 flex items-center gap-2">
              <i className="ri-error-warning-line"></i> {error}
              <button onClick={loadData} className="ml-auto text-red-600 hover:underline text-xs">重试</button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 mb-4">
              {[
                { label: '总文件', value: stats.total, color: 'text-gray-700' },
                { label: '有效文件', value: stats.valid, color: 'text-blue-600' },
                { label: '主影像', value: stats.primary, color: 'text-indigo-600' },
                { label: '已同步', value: stats.synced, color: 'text-green-600' },
                { label: '待导入', value: stats.unsynced_primary, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters + Actions */}
          <div className="bg-white border border-gray-200 rounded-xl mb-4">
            <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100 items-center">
              <div className="relative">
                <select
                  className="appearance-none border border-gray-300 rounded-lg pl-3 pr-9 py-1.5 text-sm text-gray-700 bg-white"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'none',
                  }}
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="">全部月份</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <i className="ri-arrow-down-s-line pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <select
                  className="appearance-none border border-gray-300 rounded-lg pl-3 pr-9 py-1.5 text-sm text-gray-700 bg-white"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'none',
                  }}
                  value={filterSynced}
                  onChange={e => setFilterSynced(e.target.value)}
                >
                  <option value="all">全部状态</option>
                  <option value="false">待导入</option>
                  <option value="true">已同步</option>
                </select>
                <i className="ri-arrow-down-s-line pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <select
                  className="appearance-none border border-gray-300 rounded-lg pl-3 pr-9 py-1.5 text-sm text-gray-700 bg-white"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'none',
                  }}
                  value={filterPatient}
                  onChange={e => setFilterPatient(e.target.value)}
                >
                  <option value="">全部患者</option>
                  {patients.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <i className="ri-arrow-down-s-line pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i> 刷新
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-sm text-gray-500">
                {selectedIds.size > 0 ? `已选 ${selectedIds.size} 个` : `共 ${files.length} 个文件`}
              </span>
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">全选待导入</button>
              <button onClick={clearSel} className="text-xs text-gray-500 hover:underline">清除选择</button>
              <div className="ml-auto">
                <button
                  onClick={importSelected}
                  disabled={selectedIds.size === 0 || importing}
                  className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {importing
                    ? <><i className="ri-loader-4-line animate-spin"></i> 导入中…</>
                    : <><i className="ri-download-cloud-line"></i> 批量导入</>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* File table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <i className="ri-loader-4-line animate-spin text-2xl mr-2"></i> 加载中…
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <i className="ri-folder-open-line text-4xl mb-2"></i>
                <p className="text-sm">{error ? '连接失败，请检查配置' : '暂无文件，请先配置并连接服务'}</p>
                {!error && !stats && (
                  <button onClick={loadData} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    连接服务
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size > 0 && selectedIds.size === files.filter(f => !f.is_synced && f.is_valid).length}
                          onChange={e => e.target.checked ? selectAll() : clearSel()}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">月份</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">患者</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">文件名</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">大小</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">同步时间</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">状态</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(f => {
                      const state = importStateFor(f.id);
                      const canSelect = !f.is_synced && f.is_valid && state?.status !== 'done';
                      return (
                        <tr key={f.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedIds.has(f.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(f.id)}
                              disabled={!canSelect}
                              onChange={() => toggleSelect(f.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs">{f.month_folder}</td>
                          <td className="px-3 py-2 text-gray-700">{f.patient_folder}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{f.filename}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtSize(f.file_size)}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                            {f.synced_at ? new Date(f.synced_at).toLocaleString('zh-CN') : '—'}
                          </td>
                          <td className="px-3 py-2">{statusBadge(f)}</td>
                          <td className="px-3 py-2">
                            {canSelect && (
                              <button
                                onClick={async () => {
                                  setImporting(true);
                                  try {
                                    await importFile(f);
                                    showToast(`✓ ${f.filename} 导入成功`);
                                    loadData();
                                  } catch (e: unknown) {
                                    setFileImportState(f.id, 'error', (e as Error).message);
                                    showToast(`✗ ${f.filename} 导入失败`);
                                  } finally {
                                    setImporting(false);
                                  }
                                }}
                                disabled={importing}
                                className="px-2.5 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                导入
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm shadow-lg z-50 flex items-center gap-2">
          {toast}
        </div>
      )}
    </div>
  );
}
