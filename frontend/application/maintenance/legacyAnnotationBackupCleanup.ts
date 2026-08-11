export const LEGACY_ANNOTATION_BACKUP_CLEANUP_MARKER =
  'maintenance:legacy-annotation-backup-cleanup:v1';

const LEGACY_ANNOTATION_PREFIX = 'annotations_';
const LEGACY_ANNOTATION_INDEX_KEY = 'annotation_cache_index';

/**
 * 一次性移除旧版浏览器标注副本。清理失败不影响应用启动或服务器保存链路。
 */
export function cleanupLegacyAnnotationBackups(storage: Storage): void {
  try {
    if (storage.getItem(LEGACY_ANNOTATION_BACKUP_CLEANUP_MARKER) === 'done') {
      return;
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key === LEGACY_ANNOTATION_INDEX_KEY ||
        key?.startsWith(LEGACY_ANNOTATION_PREFIX)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key));
    storage.setItem(LEGACY_ANNOTATION_BACKUP_CLEANUP_MARKER, 'done');
  } catch {
    // best-effort maintenance only
  }
}

export function runLegacyAnnotationBackupCleanup(): void {
  try {
    cleanupLegacyAnnotationBackups(window.localStorage);
  } catch {
    // localStorage can be unavailable in privacy-restricted environments.
  }
}
