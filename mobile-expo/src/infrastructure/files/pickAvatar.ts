import * as ImagePicker from 'expo-image-picker';
import { File, FileMode } from 'expo-file-system';
import type { AvatarFile } from '../../features/profile/application/ports';

export async function pickAvatar(): Promise<AvatarFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  return {
    name: asset.fileName || 'avatar.jpg',
    size: asset.fileSize ?? file.size,
    mimeType: asset.mimeType || file.type || 'image/jpeg',
    async readChunk(start, end) {
      const handle = file.open(FileMode.ReadOnly);
      try {
        handle.offset = start;
        return handle.readBytes(end - start).buffer;
      } finally {
        handle.close();
      }
    },
  };
}
