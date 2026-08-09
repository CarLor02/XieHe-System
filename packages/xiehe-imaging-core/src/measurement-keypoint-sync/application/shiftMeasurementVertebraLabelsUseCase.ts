import type { MeasurementData } from '../../contracts';
import {
  createAvtMetadata,
  isAvtMetadata,
} from '../../measurements/manual-tools/ap';

/**
 * 将关键点椎体偏移结果同步到测量项端椎和 AVT metadata。
 *
 * 该流程同时理解关键点标签映射与测量实体，因此归属于同步模块的应用层。
 */
export function shiftMeasurementVertebraLabels(
  measurements: MeasurementData[],
  vertebraLabelMap: Map<string, string>
): MeasurementData[] {
  const shiftField = (value?: string | null): string | null | undefined => {
    if (value == null) return value;
    return vertebraLabelMap.get(value) ?? value;
  };

  return measurements.map(measurement => {
    let avtMetadata = measurement.avtMetadata;
    if (isAvtMetadata(avtMetadata)) {
      if (avtMetadata.target.type === 'vertebra') {
        const shifted = vertebraLabelMap.get(avtMetadata.target.vertebra);
        if (shifted) {
          avtMetadata = createAvtMetadata({
            type: 'vertebra',
            vertebra: shifted,
          });
        }
      } else {
        const shiftedUpper = vertebraLabelMap.get(
          avtMetadata.target.upperVertebra
        );
        const shiftedLower = vertebraLabelMap.get(
          avtMetadata.target.lowerVertebra
        );
        // 历史兼容：椎间盘目标只有两端同时偏移时才更新，避免生成非相邻组合。
        if (shiftedUpper && shiftedLower) {
          avtMetadata = createAvtMetadata({
            type: 'disc',
            upperVertebra: shiftedUpper,
            lowerVertebra: shiftedLower,
          });
        }
      }
    }

    return {
      ...measurement,
      upperVertebra: shiftField(measurement.upperVertebra),
      lowerVertebra: shiftField(measurement.lowerVertebra),
      apexVertebra: shiftField(measurement.apexVertebra),
      avtMetadata,
    };
  });
}
