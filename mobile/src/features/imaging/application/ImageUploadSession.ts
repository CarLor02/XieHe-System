import { getApiErrorMessage } from '@xiehe/api-client';
import { EXAM_TYPES } from '@xiehe/imaging-core';
import {
  advanceUploadOptions,
  enqueueUploadOptions,
  removeFromUploadOptions,
  runWithConcurrency,
  validateUploadStart,
  type UploadOptionsQueueState,
} from '@xiehe/upload-core';
import {
  validateUploadFile,
  type MobileUploadFile,
} from '@/features/imaging/domain/upload';
import {
  canEditImagePixels,
  type ImageUploadEntry,
  type UploadTeam,
} from '@/features/imaging/domain/uploadEntry';
import { releaseUnusedUploadFiles } from './uploadFileResources';

export interface ImageUploadPorts {
  pick(
    source: 'file' | 'gallery'
  ): Promise<{ files: MobileUploadFile[]; errors: string[] }>;
  flip(file: MobileUploadFile): Promise<MobileUploadFile>;
  crop(file: MobileUploadFile): Promise<MobileUploadFile | null>;
  upload(
    file: MobileUploadFile,
    patientId: number | null,
    examType: string,
    teamIds: number[],
    onProgress: (progress: number) => void
  ): Promise<number>;
}

interface UploadState {
  entries: ImageUploadEntry[];
  options: UploadOptionsQueueState;
  activity: 'idle' | 'picking' | 'editing' | 'uploading';
  error: string;
}

export class ImageUploadSession {
  private state: UploadState = {
    entries: [],
    options: { activeFileId: null, queuedFileIds: [] },
    activity: 'idle',
    error: '',
  };
  private listeners = new Set<() => void>();
  private nextId = 0;
  private disposed = false;
  constructor(private readonly ports: ImageUploadPorts) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  activate = () => {
    this.disposed = false;
  };
  dispose = () => {
    this.disposed = true;
    // 正在发送的分片仍需读本地文件，完成当前操作后才能回收缓存。
    if (this.state.activity === 'idle') this.update({ entries: [] });
  };
  private update(patch: Partial<UploadState>) {
    const previous = this.state.entries;
    this.state = { ...this.state, ...patch };
    if (this.disposed && this.state.activity === 'idle')
      this.state.entries = [];
    releaseUnusedUploadFiles(previous, this.state.entries);
    this.listeners.forEach(listener => listener());
  }
  private replace(entry: ImageUploadEntry) {
    this.update({
      entries: this.state.entries.map(item =>
        item.id === entry.id ? entry : item
      ),
    });
  }
  private get idle() {
    return !this.disposed && this.state.activity === 'idle';
  }
  private get active() {
    return this.state.entries.find(
      entry => entry.id === this.state.options.activeFileId
    );
  }

  pick = async (source: 'file' | 'gallery') => {
    if (!this.idle || this.active) return;
    this.update({ activity: 'picking', error: '' });
    try {
      const result = await this.ports.pick(source);
      const entries = result.files.map(file => ({
        id: `upload-${++this.nextId}`,
        originalFile: file,
        cropSourceFile: file,
        file,
        flipped: false,
        cropped: false,
        examType: EXAM_TYPES[0],
        teams: [],
        status: 'pending' as const,
        progress: 0,
        error: '',
      }));
      this.update({
        entries: [...this.state.entries, ...entries],
        options: enqueueUploadOptions(
          this.state.options,
          entries.map(entry => entry.id)
        ),
        error: result.errors.join('\n'),
      });
    } catch (cause) {
      this.update({ error: getApiErrorMessage(cause) });
    } finally {
      this.update({ activity: 'idle' });
    }
  };
  openEditor = (id: string) => {
    const entry = this.state.entries.find(item => item.id === id);
    if (!this.idle || this.active || !entry || entry.status === 'completed')
      return;
    this.update({
      options: { activeFileId: id, queuedFileIds: [] },
      error: '',
    });
  };
  closeEditor = () => {
    if (this.idle)
      this.update({ options: advanceUploadOptions(this.state.options) });
  };
  setExamType = (examType: string) => {
    if (this.idle && this.active) this.replace({ ...this.active, examType });
  };
  setTeams = (teams: UploadTeam[]) => {
    if (this.idle && this.active) this.replace({ ...this.active, teams });
  };
  remove = (id: string) => {
    if (!this.idle) return;
    this.update({
      entries: this.state.entries.filter(entry => entry.id !== id),
      options: removeFromUploadOptions(this.state.options, id),
    });
  };
  clear = () => {
    if (this.idle)
      this.update({
        entries: [],
        options: { activeFileId: null, queuedFileIds: [] },
        error: '',
      });
  };
  resetImage = () => {
    if (!this.idle || !this.active) return;
    this.replace({
      ...this.active,
      file: this.active.originalFile,
      cropSourceFile: this.active.originalFile,
      flipped: false,
      cropped: false,
    });
  };
  editPixels = async (operation: 'flip' | 'crop') => {
    const entry = this.active;
    if (!this.idle || !entry || !canEditImagePixels(entry.file)) return;
    this.update({ activity: 'editing', error: '' });
    const created: MobileUploadFile[] = [];
    try {
      if (operation === 'crop') {
        const file = await this.ports.crop(entry.cropSourceFile);
        if (file) {
          created.push(file);
          validateUploadFile(file);
          this.replace({ ...entry, file, cropped: true });
        }
      } else {
        const source = entry.flipped
          ? entry.originalFile
          : await this.ports.flip(entry.originalFile);
        if (source !== entry.originalFile) created.push(source);
        const file = entry.cropped ? await this.ports.flip(entry.file) : source;
        if (file !== source) created.push(file);
        validateUploadFile(file);
        this.replace({
          ...entry,
          file,
          cropSourceFile: source,
          flipped: !entry.flipped,
        });
      }
    } catch (cause) {
      created.forEach(file => file.release?.());
      this.update({ error: getApiErrorMessage(cause) });
    } finally {
      this.update({ activity: 'idle' });
    }
  };

  upload = async (patientId: number | null, onlyId?: string) => {
    if (!this.idle || this.active) return;
    const pending = this.state.entries
      .filter(
        entry =>
          entry.status !== 'completed' && (!onlyId || entry.id === onlyId)
      )
      .map(entry => ({ ...entry, status: 'pending' as const }));
    const validation = validateUploadStart(patientId, pending);
    if (validation) {
      this.update({
        error: {
          'missing-patient': '请选择患者',
          'missing-exam-type': '请为所有待上传影像选择检查类型',
          'no-pending-files': '没有需要上传的影像',
        }[validation],
      });
      return;
    }
    this.update({ activity: 'uploading', error: '' });
    // 文件最多并发两张；每张仍复用原分片流程，服务端确认后才记为成功。
    try {
      await runWithConcurrency(pending, 2, async entry => {
        this.replace({ ...entry, status: 'uploading', progress: 0, error: '' });
        try {
          const imageId = await this.ports.upload(
            entry.file,
            patientId,
            entry.examType,
            entry.teams.map(team => team.id),
            progress => {
              this.replace({
                ...entry,
                status: 'uploading',
                progress: Math.min(99, progress),
                error: '',
              });
            }
          );
          this.replace({
            ...entry,
            status: 'completed',
            progress: 100,
            error: '',
            imageId,
          });
        } catch (cause) {
          this.replace({
            ...entry,
            status: 'error',
            progress: 0,
            error: getApiErrorMessage(cause),
          });
        }
      });
    } finally {
      this.update({ activity: 'idle' });
    }
  };
}
