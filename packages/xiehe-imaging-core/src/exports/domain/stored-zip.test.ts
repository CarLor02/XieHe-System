import { describe, expect, it } from 'vitest';

import { createStoredZip } from './stored-zip';

describe('stored ZIP builder', () => {
  it('preserves patient directories and makes duplicate names unique', () => {
    const archive = createStoredZip(
      [
        { path: 'P001/image.png', data: new Uint8Array([1]) },
        { path: 'P001/image.png', data: new Uint8Array([2]) },
      ],
      { now: () => new Date('2026-01-01T00:00:00') }
    );
    const text = new TextDecoder().decode(archive);
    expect(text).toContain('P001/');
    expect(text).toContain('P001/image.png');
    expect(text).toContain('P001/image (2).png');
    expect(new DataView(archive.buffer).getUint32(0, true)).toBe(0x04034b50);
  });
});
