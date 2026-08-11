import { describe, expect, it } from '@jest/globals';

import {
  splitImageFilename,
  validateImageBasename,
} from '@xiehe/imaging-core/image-files';

describe('image filename rules', () => {
  it('splits the final extension from the editable basename', () => {
    expect(splitImageFilename('patient.scan.png')).toEqual({
      basename: 'patient.scan',
      extension: '.png',
    });
    expect(splitImageFilename('dicom-file')).toEqual({
      basename: 'dicom-file',
      extension: '',
    });
  });

  it('rejects blank, path-like and overlong basenames', () => {
    expect(validateImageBasename('   ', '.png')).toBe('新影像名不能为空');
    expect(validateImageBasename('folder/name', '.png')).toBe(
      '新影像名不能包含路径分隔符'
    );
    expect(validateImageBasename('a'.repeat(252), '.png')).toBe('新影像名过长');
  });
});
