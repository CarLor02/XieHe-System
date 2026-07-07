export async function maybeFlipImageFile(file: File, enabled: boolean): Promise<File> {
  if (!enabled || !file.type.startsWith('image/')) {
    return file;
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    return await new Promise<File>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('无法创建影像处理画布'));
          return;
        }
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(image, 0, 0);
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('无法生成翻转后的影像'));
            return;
          }
          resolve(new File([blob], file.name, { type: file.type || 'image/png' }));
        }, file.type || 'image/png');
      };
      image.onerror = () => reject(new Error('无法读取待翻转影像'));
      image.src = sourceUrl;
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
