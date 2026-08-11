const MAX_IMAGE_FILENAME_LENGTH = 255;

export interface ImageFilenameParts {
  basename: string;
  extension: string;
}

export function splitImageFilename(filename: string): ImageFilenameParts {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex <= 0) return { basename: filename, extension: '' };
  return {
    basename: filename.slice(0, lastDotIndex),
    extension: filename.slice(lastDotIndex),
  };
}

export function validateImageBasename(
  value: string,
  extension: string
): string | null {
  const basename = value.trim();
  if (!basename) return '新影像名不能为空';
  if (basename.includes('/') || basename.includes('\\')) {
    return '新影像名不能包含路径分隔符';
  }
  if ([...basename].some(character => character.charCodeAt(0) < 32)) {
    return '新影像名不能包含控制字符';
  }
  if (basename.length + extension.length > MAX_IMAGE_FILENAME_LENGTH) {
    return '新影像名过长';
  }
  return null;
}
