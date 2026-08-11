import { createStoredZip, sanitizeFilename } from '@xiehe/imaging-core/exports';

import type { ExportFile } from '../domain';

export async function createZipBlob(files: ExportFile[]): Promise<Blob> {
  const entries = await Promise.all(
    files.map(async file => ({
      path: file.filename,
      data: new Uint8Array(await file.blob.arrayBuffer()),
    }))
  );
  const archive = createStoredZip(entries);
  return new Blob([archive.buffer as ArrayBuffer], {
    type: 'application/zip',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename) || 'export';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadExportFiles(
  files: ExportFile[],
  zipFilename: string
) {
  if (files.length === 0) return;
  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].filename);
    return;
  }
  downloadBlob(await createZipBlob(files), zipFilename);
}
