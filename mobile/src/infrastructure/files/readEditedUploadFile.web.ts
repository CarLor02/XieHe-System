import { readMobileFile } from './readMobileFile.web';
import type { CroppedImage } from '@/shared/ui/image-cropper';

export async function readEditedUploadFile(name: string, image: CroppedImage) {
  const blob = await (await fetch(image.uri)).blob();
  const file = new File([blob], name.replace(/\.[^.]+$/, '.png'), {
    type: 'image/png',
  });
  const uri = URL.createObjectURL(file);
  const release = () => URL.revokeObjectURL(uri);
  try {
    return { ...readMobileFile({ name: file.name, uri, file }), release };
  } catch (cause) {
    release();
    throw cause;
  }
}
