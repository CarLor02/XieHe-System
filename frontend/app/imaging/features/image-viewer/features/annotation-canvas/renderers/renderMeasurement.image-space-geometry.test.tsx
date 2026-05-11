import { isValidElement, ReactNode } from 'react';
import { expect, it } from '@jest/globals';

import { createEmptyBindings } from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { imageToScreen, screenToImage } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/transform/coordinate-transform';
import renderMeasurement from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/renderMeasurement';
import { MeasurementData, Point, TransformContext } from '@/app/imaging/features/image-viewer/shared/types';

type LineProps = {
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  strokeDasharray?: string;
};

const imageNaturalSize = { width: 1000, height: 1000 };
const imagePosition = { x: 0, y: 0 };

const desktopContainer = { width: 1000, height: 1000 };
const compactContainer = { width: 500, height: 500 };

function collectLineProps(node: ReactNode): LineProps[] {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectLineProps);
  }

  if (isValidElement<LineProps & { children?: ReactNode }>(node)) {
    const ownLine = node.type === 'line' ? [node.props] : [];
    return [...ownLine, ...collectLineProps(node.props.children)];
  }

  return [];
}

function numberValue(value: number | string | undefined): number {
  if (value === undefined) {
    throw new Error('Expected numeric SVG prop to be present');
  }
  return Number(value);
}

function closeTo(left: number | string | undefined, right: number, precision = 4) {
  return Math.abs(numberValue(left) - right) < Math.pow(10, -precision);
}

function transformContext(containerSize: { width: number; height: number }): TransformContext {
  return {
    imageNaturalSize,
    imagePosition,
    imageScale: 1,
    containerSize,
  };
}

function renderMeasurementLines(
  measurement: MeasurementData,
  containerSize: { width: number; height: number }
): LineProps[] {
  return collectLineProps(
    renderMeasurement({
      measurement,
      imageScale: 1,
      imagePosition,
      imageNaturalSize,
      containerSize,
      selectionState: {
        measurementId: null,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      },
      hoverState: {
        measurementId: null,
        keypointId: null,
        pointIndex: null,
        elementType: null,
      },
      hideAllLabels: true,
      hiddenMeasurementIds: new Set<string>(),
      pointBindings: createEmptyBindings(),
      selectedBindingGroupId: null,
      isManualBindingMode: false,
      manualBindingSelectedPoints: [],
    })
  );
}

function projectImagePoint(
  point: Point,
  containerSize: { width: number; height: number }
): Point {
  return imageToScreen(point, transformContext(containerSize));
}

function lineEndToImagePoint(
  line: LineProps,
  containerSize: { width: number; height: number },
  end: 'start' | 'end'
): Point {
  const x = end === 'start' ? numberValue(line.x1) : numberValue(line.x2);
  const y = end === 'start' ? numberValue(line.y1) : numberValue(line.y2);
  return screenToImage(x, y, transformContext(containerSize));
}

it('keeps SVA guide line endpoints fixed in image coordinates across viewport sizes', () => {
  const measurement: MeasurementData = {
    id: 'sva-1',
    type: 'sva',
    value: '0mm',
    points: [
      { x: 300, y: 200 },
      { x: 500, y: 200 },
      { x: 500, y: 400 },
      { x: 300, y: 400 },
      { x: 700, y: 500 },
    ],
  };
  const imageCenter = { x: 400, y: 300 };

  const desktopCenter = projectImagePoint(imageCenter, desktopContainer);
  const compactCenter = projectImagePoint(imageCenter, compactContainer);

  const desktopGuide = renderMeasurementLines(measurement, desktopContainer).find(
    line =>
      line.strokeDasharray === '3,3' &&
      closeTo(line.x1, desktopCenter.x) &&
      closeTo(line.y1, desktopCenter.y) &&
      closeTo(line.x2, desktopCenter.x) &&
      numberValue(line.y2) > desktopCenter.y
  );
  const compactGuide = renderMeasurementLines(measurement, compactContainer).find(
    line =>
      line.strokeDasharray === '3,3' &&
      closeTo(line.x1, compactCenter.x) &&
      closeTo(line.y1, compactCenter.y) &&
      closeTo(line.x2, compactCenter.x) &&
      numberValue(line.y2) > compactCenter.y
  );

  expect(desktopGuide).toBeDefined();
  expect(compactGuide).toBeDefined();

  const desktopEnd = lineEndToImagePoint(desktopGuide!, desktopContainer, 'end');
  const compactEnd = lineEndToImagePoint(compactGuide!, compactContainer, 'end');

  expect(desktopEnd.y).toBeCloseTo(compactEnd.y, 5);
});

it('keeps LLD horizontal guide endpoints fixed in image coordinates across viewport sizes', () => {
  const measurement: MeasurementData = {
    id: 'lld-1',
    type: 'lld',
    value: '0mm',
    points: [
      { x: 300, y: 300 },
      { x: 600, y: 500 },
    ],
  };
  const firstPoint = measurement.points[0];
  const desktopFirstPoint = projectImagePoint(firstPoint, desktopContainer);
  const compactFirstPoint = projectImagePoint(firstPoint, compactContainer);

  const desktopGuide = renderMeasurementLines(measurement, desktopContainer).find(
    line =>
      line.strokeDasharray === '3,3' &&
      closeTo(line.y1, desktopFirstPoint.y) &&
      closeTo(line.y2, desktopFirstPoint.y) &&
      numberValue(line.x1) < desktopFirstPoint.x &&
      numberValue(line.x2) > desktopFirstPoint.x
  );
  const compactGuide = renderMeasurementLines(measurement, compactContainer).find(
    line =>
      line.strokeDasharray === '3,3' &&
      closeTo(line.y1, compactFirstPoint.y) &&
      closeTo(line.y2, compactFirstPoint.y) &&
      numberValue(line.x1) < compactFirstPoint.x &&
      numberValue(line.x2) > compactFirstPoint.x
  );

  expect(desktopGuide).toBeDefined();
  expect(compactGuide).toBeDefined();

  const desktopStart = lineEndToImagePoint(desktopGuide!, desktopContainer, 'start');
  const compactStart = lineEndToImagePoint(compactGuide!, compactContainer, 'start');

  expect(desktopStart.x).toBeCloseTo(compactStart.x, 5);
});
