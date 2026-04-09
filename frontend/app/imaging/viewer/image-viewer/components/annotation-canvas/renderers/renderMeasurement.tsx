import { getLabelPositionForType, renderSpecialSVGElements } from '../../../domain/annotation-metadata';
import { imageToScreen } from '../../../canvas/transform/coordinate-transform';
import { Measurement } from '../../../types';
import { renderDescriptionLabel } from './shared/rendererUtils';

interface RenderMeasurementProps {
  measurement: Measurement;
  imageScale: number;
  imagePosition: { x: number; y: number };
  imageNaturalSize: { width: number; height: number } | null;
  displayColor: string;
}

/**
 * 正式标注 renderer 总入口。
 * 当前先复用已有的特殊图元渲染逻辑，并统一标签绘制位置。
 */
export default function renderMeasurement({
  measurement,
  imageScale,
  imagePosition,
  imageNaturalSize,
  displayColor,
}: RenderMeasurementProps) {
  const context = {
    imageNaturalSize,
    imagePosition,
    imageScale,
  };
  const screenPoints = measurement.points.map(point => imageToScreen(point, context));
  const labelPosition = imageToScreen(
    getLabelPositionForType(measurement.type, measurement.points, imageScale),
    context
  );

  return (
    <g key={measurement.id}>
      {renderSpecialSVGElements(
        measurement.type,
        screenPoints,
        displayColor,
        imageScale
      )}
      {renderDescriptionLabel(measurement, labelPosition)}
    </g>
  );
}

