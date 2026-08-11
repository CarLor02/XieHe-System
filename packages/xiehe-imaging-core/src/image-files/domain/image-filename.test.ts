import { describe, expect, it } from 'vitest';
import { splitImageFilename, validateImageBasename } from './image-filename';

describe('image filename', () => {
  it('preserves the extension separately from the editable basename', () => {
    expect(splitImageFilename('patient.scan.png')).toEqual({
      basename: 'patient.scan',
      extension: '.png',
    });
  });

  it('rejects empty names and path separators', () => {
    expect(validateImageBasename(' ', '.png')).toBe('新影像名不能为空');
    expect(validateImageBasename('../scan', '.png')).toBe(
      '新影像名不能包含路径分隔符'
    );
  });
});
