import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { colors } from '@/shared/theme';
import type { ImageCropper } from './types';

async function open(uri: string) {
  // 延迟加载原生模块，Expo Go 未包含裁剪库时仅影响裁剪，不阻断整个应用启动。
  const { default: picker } = await import('react-native-image-crop-picker');
  const context = ImageManipulator.manipulate(uri);
  let preparedUri: string | undefined;
  let previewPath: string | undefined;
  try {
    const original = await context.renderAsync();
    let prepared;
    try {
      prepared = await original.saveAsync({ format: SaveFormat.PNG });
    } finally {
      original.release();
    }
    preparedUri = prepared.uri;
    const selection = await picker.openCropper({
      path: prepared.uri,
      mediaType: 'photo',
      freeStyleCropEnabled: true,
      hideBottomControls: true,
      enableRotationGesture: false,
      cropperRotateButtonsHidden: true,
      cropperToolbarTitle: '裁剪影像',
      cropperChooseText: '确定',
      cropperCancelText: '取消',
      cropperToolbarColor: colors.primary,
      cropperToolbarWidgetColor: colors.onPrimary,
      cropperActiveWidgetColor: colors.primary,
      compressImageQuality: 1,
    });
    previewPath = selection.path;
    const rect = selection.cropRect;
    if (
      !rect ||
      rect.x < 0 ||
      rect.y < 0 ||
      rect.width <= 0 ||
      rect.height <= 0
    )
      throw new Error('未获取到有效的裁剪区域');
    // iOS 裁剪库会按默认尺寸缩放输出，只取公开的 cropRect，用 Expo 从原尺寸导出。
    // 先统一 EXIF 方向并禁用旋转，确保两个库使用相同的图像坐标。
    const cropContext = ImageManipulator.manipulate(prepared.uri);
    try {
      cropContext.crop({
        originX: rect.x,
        originY: rect.y,
        width: rect.width,
        height: rect.height,
      });
      const cropped = await cropContext.renderAsync();
      try {
        return await cropped.saveAsync({ format: SaveFormat.PNG });
      } finally {
        cropped.release();
      }
    } finally {
      cropContext.release();
    }
  } catch (cause) {
    if (
      cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === 'E_PICKER_CANCELLED'
    )
      return null;
    throw cause;
  } finally {
    context.release();
    if (previewPath)
      await picker.cleanSingle(previewPath).catch(() => undefined);
    if (preparedUri) {
      try {
        new File(preparedUri).delete();
      } catch {
        /* 缓存回收失败不影响裁剪结果。 */
      }
    }
  }
}

export function useImageCropper(): ImageCropper {
  return { open, element: null };
}
