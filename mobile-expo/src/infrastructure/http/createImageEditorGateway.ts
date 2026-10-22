import type { XieheApiSdk } from '@xiehe/api-sdk';
import type { RequestSaveAnnotation } from '@xiehe/api-contracts/generated';
import type { ImageEditorGateway } from '../../features/image-editor';
import { requireSupportedImage } from '../../features/imaging/domain/supportedImage';

export function createImageEditorGateway(
  imaging: Pick<
    XieheApiSdk['imaging'],
    'get' | 'getDownloadUrl' | 'getDownloadUrls' | 'saveAnnotation'
  >
): ImageEditorGateway {
  return {
    getImage: imaging.get,
    async getPreview(image) {
      requireSupportedImage(image.file_type);
      if (image.file_type === 'PNG' || image.file_type === 'JPEG') {
        return {
          uri: (await imaging.getDownloadUrl(image.id)).url,
          isThumbnail: false,
        };
      }
      const response = await imaging.getDownloadUrls([image.id], {
        variant: 'thumbnail',
      });
      const item = response.items[image.id];
      if (!item)
        throw new Error(
          response.errors[image.id]?.message ?? '暂无可显示的影像预览'
        );
      return { uri: item.url, isThumbnail: true };
    },
    save: ({ imageId, expectedVersion, annotation }) =>
      imaging.saveAnnotation(
        imageId,
        expectedVersion,
        // Core 的版本化文档只含 JSON 值；生成的 JSON 索引签名在 HTTP 边界适配。
        annotation as unknown as RequestSaveAnnotation['annotation']
      ),
  };
}
