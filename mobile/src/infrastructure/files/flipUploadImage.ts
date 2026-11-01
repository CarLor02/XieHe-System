import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { MobileUploadFile } from '@/features/imaging/domain/upload';
import { readEditedUploadFile } from './readEditedUploadFile';

export async function flipUploadImage(file: MobileUploadFile) {
  const context = ImageManipulator.manipulate(file.uri);
  try {
    context.flip('horizontal');
    const image = await context.renderAsync();
    try {
      return await readEditedUploadFile(
        file.name,
        await image.saveAsync({ format: SaveFormat.PNG })
      );
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
