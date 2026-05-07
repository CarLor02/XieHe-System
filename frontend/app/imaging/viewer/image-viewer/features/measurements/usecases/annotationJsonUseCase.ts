import React from 'react';
import {
  ImageSize,
  MeasurementData,
  Point,
} from '@/app/imaging/viewer/image-viewer/shared/types';
import { getAnnotationTypeId } from '../catalog/shared/annotation-config';

export function exportAnnotationsToJSON({
  isAdmin,
  imageId,
  imageNaturalSize,
  measurements,
  standardDistance,
  standardDistancePoints,
  setSaveMessage,
}: {
  isAdmin: boolean;
  imageId: string;
  imageNaturalSize: ImageSize | null;
  measurements: MeasurementData[];
  standardDistance: number | null;
  standardDistancePoints: Point[];
  setSaveMessage: (message: string) => void;
}): void {
  if (!isAdmin) {
    setSaveMessage('无权限：仅管理员可以导出JSON文件');
    setTimeout(() => setSaveMessage(''), 3000);
    return;
  }

  try {
    const simplifiedMeasurements = measurements.map(measurement => ({
      type: measurement.type,
      points: measurement.points,
    }));

    const data = {
      imageId,
      imageWidth: imageNaturalSize?.width,
      imageHeight: imageNaturalSize?.height,
      measurements: simplifiedMeasurements,
      standardDistance,
      standardDistancePoints,
    };
    console.log('导出标注数据，图像尺寸:', {
      width: imageNaturalSize?.width,
      height: imageNaturalSize?.height,
      standardDistance,
    });
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${imageId}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaveMessage('标注文件已下载');
    setTimeout(() => setSaveMessage(''), 2000);
  } catch (error) {
    console.error('导出标注文件失败:', error);
    setSaveMessage('导出失败，请重试');
    setTimeout(() => setSaveMessage(''), 2000);
  }
}

export function importAnnotationsFromJSON({
  event,
  imageNaturalSize,
  setMeasurements,
  setStandardDistance,
  setStandardDistancePoints,
  setSaveMessage,
  calculateMeasurementValue,
  getDescriptionForType,
}: {
  event: React.ChangeEvent<HTMLInputElement>;
  imageNaturalSize: ImageSize | null;
  setMeasurements: (measurements: MeasurementData[]) => void;
  setStandardDistance: (distance: number | null) => void;
  setStandardDistancePoints: (points: Point[]) => void;
  setSaveMessage: (message: string) => void;
  calculateMeasurementValue: (type: string, points: Point[]) => string;
  getDescriptionForType: (type: string) => string;
}): void {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const jsonStr = e.target?.result as string;
      const data = JSON.parse(jsonStr);

      if (!data.measurements || !Array.isArray(data.measurements)) {
        throw new Error('无效的标注文件格式');
      }

      const importedImageWidth = data.imageWidth;
      const importedImageHeight = data.imageHeight;
      let scaleX = 1;
      let scaleY = 1;

      if (importedImageWidth && importedImageHeight && imageNaturalSize) {
        scaleX = imageNaturalSize.width / importedImageWidth;
        scaleY = imageNaturalSize.height / importedImageHeight;
        console.log('导入标注，坐标缩放比例:', {
          importedSize: {
            width: importedImageWidth,
            height: importedImageHeight,
          },
          currentSize: imageNaturalSize,
          scale: { scaleX, scaleY },
        });
      }

      const restoredMeasurements = data.measurements.map((measurement: any) => {
        const scaledPoints = measurement.points.map((point: any) => ({
          x: point.x * scaleX,
          y: point.y * scaleY,
        }));

        const isAIDetection = measurement.type.startsWith('AI检测-');
        const typeId = isAIDetection
          ? measurement.type
          : getAnnotationTypeId(measurement.type);

        return {
          id:
            Date.now().toString() +
            Math.random().toString(36).substring(2, 11),
          type: typeId,
          value: isAIDetection
            ? measurement.value || ''
            : calculateMeasurementValue(typeId, scaledPoints),
          points: scaledPoints,
          description: isAIDetection
            ? measurement.description || measurement.type
            : getDescriptionForType(typeId),
        };
      });

      setMeasurements(restoredMeasurements);

      if (
        data.standardDistance &&
        data.standardDistancePoints &&
        data.standardDistancePoints.length === 2
      ) {
        const scaledStandardPoints = data.standardDistancePoints.map(
          (point: any) => ({
            x: point.x * scaleX,
            y: point.y * scaleY,
          })
        );
        setStandardDistance(data.standardDistance);
        setStandardDistancePoints(scaledStandardPoints);
        setSaveMessage(
          `已导入 ${restoredMeasurements.length} 个标注和标准距离 ${data.standardDistance}mm`
        );
        console.log(`已导入标准距离: ${data.standardDistance}mm`);
      } else if (imageNaturalSize) {
        const defaultPoints = [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
        ];
        setStandardDistance(100);
        setStandardDistancePoints(defaultPoints);
        setSaveMessage(
          `已导入 ${restoredMeasurements.length} 个标注，未找到标准距离，已设置默认值100mm`
        );
        console.log('导入文件中未找到标准距离，已设置默认值: 100mm');
      } else {
        setSaveMessage(`已导入 ${restoredMeasurements.length} 个标注`);
      }
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('导入标注文件失败:', error);
      setSaveMessage('导入失败，文件格式错误');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };
  reader.readAsText(file);

  event.target.value = '';
}
