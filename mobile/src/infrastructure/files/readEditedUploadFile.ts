import { File } from 'expo-file-system';
import { readMobileFile } from './readMobileFile';
import type { CroppedImage } from '@/shared/ui/image-cropper';

export async function readEditedUploadFile(name: string, image: CroppedImage) {
  const nativeFile = new File(image.uri);
  const release = () => {
    try {
      if (nativeFile.exists) nativeFile.delete();
    } catch {
      /* 缓存可能已被系统回收。 */
    }
  };
  try {
    return {
      ...readMobileFile({
        name: name.replace(/\.[^.]+$/, '.png'),
        uri: image.uri,
      }),
      release,
    };
  } catch (cause) {
    release();
    throw cause;
  }
}
