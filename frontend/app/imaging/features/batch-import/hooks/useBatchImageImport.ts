import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import type {
  BatchImportFileItem,
  BatchImportOwnershipScope,
  BatchImportTab,
} from '../domain/types';
import { EXAM_TYPES } from '@/app/imaging/domain/imagingFilters';
import type {
  TeamMultiSelectLoadParams,
  TeamMultiSelectPage,
} from '@/components/common/TeamMultiSelect';
import {
  enqueueImageImportItem,
  getImageImportBatches,
  getImageImportConfig,
  getImageImportItems,
  type ImageImportBatch,
  type ImageImportItem,
} from '@/services/imageServices';
import { runBatchImportPipeline } from '../usecases/runBatchImportPipeline';

const DEFAULT_MAX_BATCH_FILES = 200;
const DEFAULT_SESSION_WINDOW_SIZE = 10;
const POLL_INTERVAL_MS = 2_000;

type LocalBatchFile = BatchImportFileItem & { file: File };

interface UseBatchImageImportOptions {
  reloadImages: () => Promise<void>;
  loadTeams: (params: TeamMultiSelectLoadParams) => Promise<TeamMultiSelectPage>;
}

function toImportFile(file: File, index: number): LocalBatchFile {
  return {
    id: `batch-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    file,
    uploadStatus: 'pending',
    aiStatus: 'pending',
  };
}

function isTerminalBatch(batch: ImageImportBatch) {
  return ['COMPLETED', 'PARTIAL_FAILED', 'FAILED'].includes(batch.status);
}

export function useBatchImageImport({
  reloadImages,
  loadTeams,
}: UseBatchImageImportOptions) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BatchImportTab>('new-import');
  const [files, setFiles] = useState<LocalBatchFile[]>([]);
  const [patientId, setPatientId] = useState('');
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0]);
  const [ownershipScope, setOwnershipScope] =
    useState<BatchImportOwnershipScope>('personal');
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [lrFlip, setLrFlip] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [maxFiles, setMaxFiles] = useState(DEFAULT_MAX_BATCH_FILES);
  const [sessionWindowSize, setSessionWindowSize] = useState(
    DEFAULT_SESSION_WINDOW_SIZE
  );
  const [batches, setBatches] = useState<ImageImportBatch[]>([]);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotalPages, setBatchTotalPages] = useState(1);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [taskItems, setTaskItems] = useState<ImageImportItem[]>([]);
  const [itemPage, setItemPage] = useState(1);
  const [itemTotalPages, setItemTotalPages] = useState(1);
  const [tasksLoading, setTasksLoading] = useState(false);
  const activeBatchIdRef = useRef<string | null>(null);

  const patchFile = useCallback(
    (fileId: string, patch: Partial<BatchImportFileItem>) => {
      setFiles(current =>
        current.map(file => (file.id === fileId ? { ...file, ...patch } : file))
      );
    },
    []
  );

  const loadBatches = useCallback(async (page: number) => {
    setTasksLoading(true);
    try {
      const result = await getImageImportBatches({ page, page_size: 10 });
      setBatches(result.items);
      setBatchPage(result.page);
      setBatchTotalPages(Math.max(1, result.totalPages));
      setSelectedBatchId(current => current ?? result.items[0]?.batch_id ?? null);
      if (
        activeBatchIdRef.current &&
        result.items.some(
          batch =>
            batch.batch_id === activeBatchIdRef.current &&
            isTerminalBatch(batch)
        )
      ) {
        activeBatchIdRef.current = null;
        void reloadImages();
      }
    } catch {
      setMessage('导入任务加载失败，请稍后重试');
    } finally {
      setTasksLoading(false);
    }
  }, [reloadImages]);

  const loadBatchItems = useCallback(async (batchId: string, page = 1) => {
    try {
      const result = await getImageImportItems(batchId, {
        page,
        page_size: 20,
      });
      setTaskItems(result.items);
      setItemPage(result.page);
      setItemTotalPages(Math.max(1, result.totalPages));
    } catch {
      setMessage('导入文件进度加载失败，请稍后重试');
    }
  }, []);

  const openOverlay = useCallback(() => {
    setOverlayOpen(true);
    setActiveTab('new-import');
    setMessage('');
    void getImageImportConfig()
      .then(config => {
        setMaxFiles(config.max_files || DEFAULT_MAX_BATCH_FILES);
        setSessionWindowSize(
          config.session_window_size || DEFAULT_SESSION_WINDOW_SIZE
        );
      })
      .catch(() => {
        setMaxFiles(DEFAULT_MAX_BATCH_FILES);
        setSessionWindowSize(DEFAULT_SESSION_WINDOW_SIZE);
      });
    void loadBatches(1);
  }, [loadBatches]);

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      event.target.value = '';
      if (selectedFiles.length === 0) return;
      if (selectedFiles.length > maxFiles) {
        setMessage(`一次最多导入 ${maxFiles} 张影像`);
        return;
      }
      setFiles(selectedFiles.map(toImportFile));
      setMessage('');
    },
    [maxFiles]
  );

  const closeOverlay = useCallback(() => {
    if (isUploading) return;
    setOverlayOpen(false);
    setFiles([]);
    setMessage('');
  }, [isUploading]);

  useEffect(() => {
    if (!overlayOpen) return;
    const hasActiveBatch =
      Boolean(activeBatchIdRef.current) || batches.some(batch => !isTerminalBatch(batch));
    if (!hasActiveBatch) return;
    const timer = window.setInterval(() => {
      void loadBatches(batchPage);
      if (selectedBatchId) void loadBatchItems(selectedBatchId, itemPage);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [
    batchPage,
    batches,
    loadBatchItems,
    loadBatches,
    overlayOpen,
    itemPage,
    selectedBatchId,
  ]);

  const startImport = useCallback(async () => {
    if (!patientId) {
      setMessage('请选择患者');
      return;
    }
    if (ownershipScope === 'team' && teamIds.length === 0) {
      setMessage('请选择至少一个归属团队');
      return;
    }
    if (files.length === 0) {
      setMessage('请选择需要导入的影像文件');
      return;
    }

    setIsUploading(true);
    try {
      const batchId = await runBatchImportPipeline({
        files,
        patientId: Number(patientId),
        description: examType,
        teamIds: ownershipScope === 'team' ? teamIds : [],
        flip: lrFlip,
        sessionWindowSize,
        onFilePatch: patchFile,
        onMessage: setMessage,
      });
      activeBatchIdRef.current = batchId;
      setSelectedBatchId(batchId);
      setActiveTab('import-tasks');
      await Promise.all([
        loadBatches(1),
        loadBatchItems(batchId, 1),
        reloadImages(),
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '批量导入失败');
    } finally {
      setIsUploading(false);
    }
  }, [
    examType,
    files,
    loadBatchItems,
    loadBatches,
    lrFlip,
    ownershipScope,
    patientId,
    patchFile,
    reloadImages,
    sessionWindowSize,
    teamIds,
  ]);

  const retryTaskItem = useCallback(
    async (itemId: number) => {
      if (!selectedBatchId) return;
      try {
        await enqueueImageImportItem(selectedBatchId, itemId);
        await loadBatchItems(selectedBatchId, itemPage);
        await loadBatches(batchPage);
      } catch {
        setMessage('AI任务重新入队失败，请稍后重试');
      }
    },
    [batchPage, itemPage, loadBatchItems, loadBatches, selectedBatchId]
  );

  const changeTab = useCallback(
    (tab: BatchImportTab) => {
      setActiveTab(tab);
      if (tab === 'import-tasks' && selectedBatchId) {
        void loadBatchItems(selectedBatchId, 1);
      }
    },
    [loadBatchItems, selectedBatchId]
  );

  const selectBatch = useCallback(
    (batchId: string) => {
      setSelectedBatchId(batchId);
      setItemPage(1);
      void loadBatchItems(batchId, 1);
    },
    [loadBatchItems]
  );

  return {
    overlayOpen,
    activeTab,
    files,
    patientId,
    examType,
    examTypes: EXAM_TYPES,
    ownershipScope,
    teamIds,
    lrFlip,
    isUploading,
    message,
    maxFiles,
    batches,
    batchPage,
    batchTotalPages,
    selectedBatchId,
    taskItems,
    itemPage,
    itemTotalPages,
    tasksLoading,
    loadTeams,
    openOverlay,
    handleFileInput,
    closeOverlay,
    setActiveTab: changeTab,
    setPatientId,
    setExamType,
    setOwnershipScope,
    setTeamIds,
    setSelectedBatchId: selectBatch,
    changeBatchPage: (page: number) => void loadBatches(page),
    changeItemPage: (page: number) => {
      if (selectedBatchId) void loadBatchItems(selectedBatchId, page);
    },
    retryTaskItem,
    toggleFlip: () => setLrFlip(value => !value),
    startImport,
  };
}
