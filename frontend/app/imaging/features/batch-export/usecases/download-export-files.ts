import { sanitizeFilename, type ExportFile } from '../domain';

const ZIP_UTF8_FLAG = 0x0800;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function createLocalHeader({
  filenameBytes,
  crc,
  size,
}: {
  filenameBytes: Uint8Array;
  crc: number;
  size: number;
}): Uint8Array {
  const header = new Uint8Array(30 + filenameBytes.length);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = getDosDateTime();

  writeUint32(view, 0, 0x04034b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, ZIP_UTF8_FLAG);
  writeUint16(view, 8, 0);
  writeUint16(view, 10, dosTime);
  writeUint16(view, 12, dosDate);
  writeUint32(view, 14, crc);
  writeUint32(view, 18, size);
  writeUint32(view, 22, size);
  writeUint16(view, 26, filenameBytes.length);
  writeUint16(view, 28, 0);
  header.set(filenameBytes, 30);

  return header;
}

function createCentralDirectoryHeader({
  filenameBytes,
  crc,
  size,
  localHeaderOffset,
}: {
  filenameBytes: Uint8Array;
  crc: number;
  size: number;
  localHeaderOffset: number;
}): Uint8Array {
  const header = new Uint8Array(46 + filenameBytes.length);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = getDosDateTime();

  writeUint32(view, 0, 0x02014b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 20);
  writeUint16(view, 8, ZIP_UTF8_FLAG);
  writeUint16(view, 10, 0);
  writeUint16(view, 12, dosTime);
  writeUint16(view, 14, dosDate);
  writeUint32(view, 16, crc);
  writeUint32(view, 20, size);
  writeUint32(view, 24, size);
  writeUint16(view, 28, filenameBytes.length);
  writeUint16(view, 30, 0);
  writeUint16(view, 32, 0);
  writeUint16(view, 34, 0);
  writeUint16(view, 36, 0);
  writeUint32(view, 38, 0);
  writeUint32(view, 42, localHeaderOffset);
  header.set(filenameBytes, 46);

  return header;
}

function createEndOfCentralDirectory({
  fileCount,
  centralDirectorySize,
  centralDirectoryOffset,
}: {
  fileCount: number;
  centralDirectorySize: number;
  centralDirectoryOffset: number;
}): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  writeUint32(view, 0, 0x06054b50);
  writeUint16(view, 4, 0);
  writeUint16(view, 6, 0);
  writeUint16(view, 8, fileCount);
  writeUint16(view, 10, fileCount);
  writeUint32(view, 12, centralDirectorySize);
  writeUint32(view, 16, centralDirectoryOffset);
  writeUint16(view, 20, 0);

  return header;
}

function makeUniqueFilename(filename: string, usedFilenames: Set<string>): string {
  const sanitized = sanitizeZipPath(filename) || 'export';
  if (!usedFilenames.has(sanitized)) {
    usedFilenames.add(sanitized);
    return sanitized;
  }

  const dotIndex = sanitized.lastIndexOf('.');
  const slashIndex = sanitized.lastIndexOf('/');
  const nameStartIndex = slashIndex >= 0 ? slashIndex + 1 : 0;
  const directory = slashIndex >= 0 ? sanitized.slice(0, nameStartIndex) : '';
  const base =
    dotIndex > nameStartIndex
      ? sanitized.slice(nameStartIndex, dotIndex)
      : sanitized.slice(nameStartIndex);
  const extension = dotIndex > nameStartIndex ? sanitized.slice(dotIndex) : '';
  let index = 2;
  let next = `${directory}${base} (${index})${extension}`;
  while (usedFilenames.has(next)) {
    index += 1;
    next = `${directory}${base} (${index})${extension}`;
  }
  usedFilenames.add(next);
  return next;
}

function sanitizeZipPath(filename: string): string {
  return filename
    .split('/')
    .map(part => sanitizeFilename(part))
    .filter(Boolean)
    .join('/');
}

export async function createZipBlob(files: ExportFile[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const usedFilenames = new Set<string>();
  const localParts: ArrayBuffer[] = [];
  const centralParts: ArrayBuffer[] = [];
  let offset = 0;
  let centralDirectorySize = 0;

  for (const file of files) {
    const filename = makeUniqueFilename(file.filename, usedFilenames);
    const filenameBytes = encoder.encode(filename);
    const contentBuffer = await file.blob.arrayBuffer();
    const content = new Uint8Array(contentBuffer);
    const crc = crc32(content);
    const localHeaderOffset = offset;
    const localHeader = createLocalHeader({
      filenameBytes,
      crc,
      size: content.length,
    });
    const centralHeader = createCentralDirectoryHeader({
      filenameBytes,
      crc,
      size: content.length,
      localHeaderOffset,
    });

    localParts.push(localHeader.buffer as ArrayBuffer, contentBuffer);
    centralParts.push(centralHeader.buffer as ArrayBuffer);
    offset += localHeader.length + content.length;
    centralDirectorySize += centralHeader.length;
  }

  const endHeader = createEndOfCentralDirectory({
    fileCount: files.length,
    centralDirectorySize,
    centralDirectoryOffset: offset,
  });

  return new Blob([...localParts, ...centralParts, endHeader.buffer as ArrayBuffer], {
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

export async function downloadExportFiles(files: ExportFile[], zipFilename: string) {
  if (files.length === 0) {
    return;
  }

  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].filename);
    return;
  }

  const zipBlob = await createZipBlob(files);
  downloadBlob(zipBlob, zipFilename);
}
