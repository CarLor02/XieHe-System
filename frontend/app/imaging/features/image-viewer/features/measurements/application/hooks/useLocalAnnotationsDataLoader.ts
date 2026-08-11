import {
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
  CfhAnnotation,
} from '@xiehe/imaging-core/contracts';
import { AnnotationBindings } from '@xiehe/imaging-core/bindings';
import { migrateAnnotationBindings } from '@xiehe/imaging-core/bindings';
import { RefObject, useEffect } from 'react';
import { getAnnotationTypeId } from '@xiehe/imaging-catalog/annotations';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { calculateMeasurementDataValue } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { createLogger } from '@/lib/logger';
import {
  decodeAnnotationDocument,
  scaleAnnotationDocument,
} from '@xiehe/imaging-core/annotation-document';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.measurements.application.hooks.useLocalAnnotationsDataLoader'
);

export function useLocalAnnotationsDataLoader(
  imageId: string,
  imageNaturalSize: ImageSize,
  examType: string,
  setMeasurements: (measurements: MeasurementData[]) => void,
  standardDistance: number | null,
  setStandardDistance: (distance: number | null) => void,
  standardDistancePoints: Point[],
  setStandardDistancePoints: (distancePoints: Point[]) => void,
  setPointBindings: (pointBindings: AnnotationBindings) => void,
  dbAnnotationLoadedRef: RefObject<boolean>,
  calcMeasurementValue: (
    type: string,
    points: Point[],
    context: CalculationContext
  ) => string,
  getDescriptionForType: (type: string) => string,
  restorePersistedKeypointState: (input: {
    examType: string;
    measurements: MeasurementData[];
    vertebraeLayer: VertebraAnnotation[];
    cfhAnnotation: CfhAnnotation | null;
  }) => void
) {
  const setDefaultStandardDistance = () => {
    const defaultPoints = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ];
    setStandardDistance(100);
    setStandardDistancePoints(defaultPoints);
    return defaultPoints;
  };

  // 从localStorage加载标注数据
  const loadAnnotationsFromLocalStorage = () => {
    // 若 DB 已成功加载标注数据，localStorage 仅作历史备份，不再覆盖
    if (dbAnnotationLoadedRef.current) {
      logger.debug('DB 标注数据已加载，跳过 localStorage');
      return;
    }
    try {
      const key = `annotations_${imageId}`;
      const jsonStr = localStorage.getItem(key);
      if (jsonStr) {
        const decoded = decodeAnnotationDocument(JSON.parse(jsonStr));
        if (!decoded) {
          throw new Error('不支持的本地标注文档版本或标注数据格式无效');
        }
        const data = scaleAnnotationDocument(decoded, imageNaturalSize);

        if (
          decoded.imageWidth !== undefined &&
          decoded.imageHeight !== undefined &&
          (decoded.imageWidth !== imageNaturalSize.width ||
            decoded.imageHeight !== imageNaturalSize.height)
        ) {
          logger.debug('从本地加载标注并迁移原图坐标系:', {
            storedSize: {
              width: decoded.imageWidth,
              height: decoded.imageHeight,
            },
            currentSize: imageNaturalSize,
          });
        }

        // 先加载或设置标准距离（必须在加载measurements之前）
        let loadedStandardDistance = standardDistance;
        let loadedStandardDistancePoints = standardDistancePoints;

        if (
          data.standardDistance !== null &&
          data.standardDistancePoints !== null &&
          data.standardDistancePoints.length === 2
        ) {
          loadedStandardDistance = data.standardDistance;
          loadedStandardDistancePoints = data.standardDistancePoints;
          setStandardDistance(data.standardDistance);
          setStandardDistancePoints(data.standardDistancePoints);
          logger.debug(`已加载标准距离: ${data.standardDistance}mm`);
        } else {
          // 如果没有保存的标准距离，设置默认值：左上角(0,0)到(200,0)，标准距离100mm
          loadedStandardDistance = 100;
          loadedStandardDistancePoints = setDefaultStandardDistance();
          logger.debug(
            '未找到标准距离，已设置默认值: 100mm，标注点: (0,0)到(200,0)'
          );
        }

        // 然后加载measurements（使用已加载的标准距离）
        let restoredMeasurements: MeasurementData[] = [];
        if (Array.isArray(data.measurements)) {
          restoredMeasurements = data.measurements.map(m => {
            // 对于AI检测的标注，保留原来的value和description
            const isAIDetection = m.type.startsWith('AI检测-');
            const typeId = isAIDetection ? m.type : getAnnotationTypeId(m.type);

            const restoredMeasurement: MeasurementData = {
              ...m,
              type: typeId,
              value: '',
              description: isAIDetection
                ? m.description || m.type
                : getDescriptionForType(typeId),
            };
            restoredMeasurement.value = isAIDetection
              ? m.value || ''
              : getAnnotationTypeId(typeId) === 'avt'
                ? calculateMeasurementDataValue(restoredMeasurement, {
                    standardDistance: loadedStandardDistance,
                    standardDistancePoints: loadedStandardDistancePoints,
                    imageNaturalSize,
                  })
                : calcMeasurementValue(typeId, m.points, {
                    standardDistance: loadedStandardDistance,
                    standardDistancePoints: loadedStandardDistancePoints,
                    imageNaturalSize,
                  });
            return restoredMeasurement;
          });
          setMeasurements(restoredMeasurements);
          logger.debug(`已从本地加载 ${restoredMeasurements.length} 个标注`);
        }
        // localStorage 与服务器读取使用同一迁移策略：自动生成的历史绑定
        // 一律不恢复，只有显式手动组能够升级为带布局指纹的 v2 数据。
        setPointBindings(
          migrateAnnotationBindings(data.pointBindings, restoredMeasurements)
        );
        const restoredVertebraeLayer = data.vertebraeLayer ?? [];
        if (restoredVertebraeLayer.length > 0) {
          logger.debug(
            `从 localStorage 恢复了 ${restoredVertebraeLayer.length} 节椎体角点`
          );
        }
        restorePersistedKeypointState({
          examType,
          measurements: restoredMeasurements,
          vertebraeLayer: restoredVertebraeLayer,
          cfhAnnotation: data.cfhAnnotation ?? null,
        });
      } else {
        // 如果完全没有保存的数据，设置默认标准距离
        setDefaultStandardDistance();
        logger.debug(
          '未找到本地数据，已设置默认标准距离: 100mm，标注点: (0,0)到(200,0)'
        );
      }
    } catch (error) {
      logger.error('加载本地标注数据失败:', error);
      // 即使加载失败，也设置默认标准距离
      setDefaultStandardDistance();
      logger.debug('加载失败，已设置默认标准距离: 100mm');
    }
  };

  // 当图像尺寸确定后，自动加载标注数据
  useEffect(() => {
    if (imageNaturalSize) {
      logger.debug('图像尺寸已确定，加载标注数据:', imageNaturalSize);
      loadAnnotationsFromLocalStorage();
    }
  }, [examType, imageNaturalSize, imageId]);
}
