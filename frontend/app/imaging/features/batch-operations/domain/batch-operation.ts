export type BatchSelectionMode = 'export' | 'set-exam-type';
export type BatchOperation = 'import' | BatchSelectionMode;

export function getBatchSelectionLabel(mode: BatchSelectionMode): string {
  return mode === 'export' ? '选择导出' : '选择设置';
}
