import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getApiErrorMessage } from '@xiehe/api-client';
import type { MobileUploadFile } from '@/features/imaging/domain/upload';
import { readMobileFile } from './readMobileFile';

export async function pickUploadImages(source: 'file' | 'gallery') {
  const files: MobileUploadFile[] = [];
  const errors: string[] = [];
  const result =
    source === 'file'
      ? await DocumentPicker.getDocumentAsync({
          type: ['image/png', 'image/jpeg'],
          copyToCacheDirectory: true,
          multiple: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: false,
          allowsMultipleSelection: true,
          orderedSelection: true,
        });
  if (result.canceled) return { files, errors };
  for (const asset of result.assets) {
    const extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
    const name =
      'name' in asset
        ? asset.name
        : asset.fileName || `spine-${Date.now()}-${files.length}.${extension}`;
    try {
      if (
        asset.mimeType &&
        ![
          'image/png',
          'image/jpeg',
          'image/jpg',
          'application/octet-stream',
        ].includes(asset.mimeType)
      ) {
        throw new Error('支持 JPG、PNG 文件');
      }
      files.push(
        readMobileFile({
          uri: asset.uri,
          name,
          size:
            'size' in asset
              ? asset.size
              : 'fileSize' in asset
                ? asset.fileSize
                : undefined,
          file: asset.file,
        })
      );
    } catch (cause) {
      errors.push(`${name}：${getApiErrorMessage(cause)}`);
    }
  }
  return { files, errors };
}
