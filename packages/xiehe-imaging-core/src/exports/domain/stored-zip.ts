import { sanitizeFilename } from './export-filenames';

const ZIP_UTF8_FLAG = 0x0800;
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export interface StoredZipEntry {
  path: string;
  data: Uint8Array;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    dosTime:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    dosDate:
      ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function sanitizeZipPath(path: string): string {
  return path
    .split('/')
    .map(segment => sanitizeFilename(segment))
    .filter(Boolean)
    .join('/');
}

function makeUniquePath(path: string, usedPaths: Set<string>): string {
  const sanitized = sanitizeZipPath(path) || 'export';
  if (!usedPaths.has(sanitized)) {
    usedPaths.add(sanitized);
    return sanitized;
  }

  const slashIndex = sanitized.lastIndexOf('/');
  const dotIndex = sanitized.lastIndexOf('.');
  const nameStart = slashIndex + 1;
  const directory = slashIndex >= 0 ? sanitized.slice(0, nameStart) : '';
  const hasExtension = dotIndex > nameStart;
  const base = sanitized.slice(nameStart, hasExtension ? dotIndex : undefined);
  const extension = hasExtension ? sanitized.slice(dotIndex) : '';
  let index = 2;
  let candidate = `${directory}${base} (${index})${extension}`;
  while (usedPaths.has(candidate)) {
    index += 1;
    candidate = `${directory}${base} (${index})${extension}`;
  }
  usedPaths.add(candidate);
  return candidate;
}

function getDirectoryEntries(path: string): string[] {
  const segments = path.split('/').filter(Boolean);
  return segments
    .slice(1)
    .map((_, index) => `${segments.slice(0, index + 1).join('/')}/`);
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/** 构建不压缩 ZIP，输出可由 Web Blob 或 Expo 文件系统直接消费的字节。 */
export function createStoredZip(
  entries: readonly StoredZipEntry[],
  options: { now?: () => Date } = {}
): Uint8Array {
  const encoder = new TextEncoder();
  const usedPaths = new Set<string>();
  const usedDirectories = new Set<string>();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const timestamp = options.now?.() ?? new Date();
  const { dosDate, dosTime } = getDosDateTime(timestamp);
  let offset = 0;
  let centralDirectorySize = 0;
  let entryCount = 0;

  const addEntry = (path: string, data: Uint8Array) => {
    const pathBytes = encoder.encode(path);
    const crc = data.length > 0 ? crc32(data) : 0;
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, ZIP_UTF8_FLAG);
    writeUint16(localView, 10, dosTime);
    writeUint16(localView, 12, dosDate);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, pathBytes.length);
    localHeader.set(pathBytes, 30);

    const centralHeader = new Uint8Array(46 + pathBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, ZIP_UTF8_FLAG);
    writeUint16(centralView, 12, dosTime);
    writeUint16(centralView, 14, dosDate);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, pathBytes.length);
    writeUint32(centralView, 42, offset);
    centralHeader.set(pathBytes, 46);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
    centralDirectorySize += centralHeader.length;
    entryCount += 1;
  };

  for (const entry of entries) {
    const path = makeUniquePath(entry.path, usedPaths);
    for (const directory of getDirectoryEntries(path)) {
      if (!usedDirectories.has(directory)) {
        usedDirectories.add(directory);
        addEntry(directory, new Uint8Array());
      }
    }
    addEntry(path, entry.data);
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, entryCount);
  writeUint16(endView, 10, entryCount);
  writeUint32(endView, 12, centralDirectorySize);
  writeUint32(endView, 16, offset);
  return concatenate([...localParts, ...centralParts, end]);
}
