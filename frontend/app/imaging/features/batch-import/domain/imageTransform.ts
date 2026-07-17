const FLIP_WORKER_SOURCE = `
self.onmessage = async (event) => {
  try {
    const { file, mimeType } = event.data;
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建影像处理画布');
    context.translate(bitmap.width, 0);
    context.scale(-1, 1);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: mimeType || 'image/png' });
    self.postMessage({ blob });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '影像处理失败' });
  }
};
`;

async function flipInWorker(file: File): Promise<File> {
  if (
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    throw new Error('worker-unavailable');
  }

  const workerUrl = URL.createObjectURL(
    new Blob([FLIP_WORKER_SOURCE], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = event => {
        if (event.data?.error) {
          reject(new Error(event.data.error));
          return;
        }
        resolve(event.data.blob);
      };
      worker.onerror = () => reject(new Error('影像处理 Worker 执行失败'));
      worker.postMessage({ file, mimeType: file.type || 'image/png' });
    });
    return new File([blob], file.name, { type: file.type || 'image/png' });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  }
}

async function flipOnMainThread(file: File): Promise<File> {
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

export async function maybeFlipImageFile(
  file: File,
  enabled: boolean
): Promise<File> {
  if (!enabled || !file.type.startsWith('image/')) {
    return file;
  }
  try {
    return await flipInWorker(file);
  } catch {
    return flipOnMainThread(file);
  }
}
