import { describe, expect, it } from 'vitest';
import {
  buildMeasurementDrawing,
  buildAvtDrawing,
  drawingBoundsPoints,
} from '../../../..';
import type { DrawingPrimitive } from './types';

const line = (drawing: DrawingPrimitive[]) =>
  drawing.filter(p => p.kind === 'line');
const points = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 400, y: 600 },
  { x: 600, y: 640 },
];

describe('measurement drawing contracts', () => {
  it('keeps TTS guide lengths in image units and arrowheads in screen units', () => {
    for (const scale of [0.25, 1, 3]) {
      const drawing = buildMeasurementDrawing('tts', points, {
        project: p => ({ x: p.x * scale + 20, y: p.y * scale - 10 }),
      });
      const lines = line(drawing);
      expect(lines[1].end.y - lines[1].start.y).toBe(150 * scale);
      expect(lines[3].end.y - lines[3].start.y).toBe(150 * scale);
      expect(lines[4].start.y).toBe(360 * scale - 10);
      const arrows = drawing.filter(p => p.kind === 'polygon');
      expect(arrows).toHaveLength(2);
      expect(Math.abs(arrows[0].points[1].x - arrows[0].points[0].x)).toBe(6);
      expect(arrows[0].points[2].y - arrows[0].points[1].y).toBe(8);
    }
  });

  it('uses the CSVL midpoint and a finite guide, without an extra horizontal CSS reference', () => {
    const lines = line(
      buildMeasurementDrawing('sacral-with-perpendicular', points.slice(2))
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({
      start: { x: 500, y: 620 },
      end: { x: 500, y: 320 },
    });
    expect(
      line(
        buildMeasurementDrawing(
          'single-line-with-horizontal',
          points.slice(0, 2)
        )
      )
    ).toHaveLength(1);
    const lld = line(
      buildMeasurementDrawing('horizontal-lines', points.slice(0, 2))
    );
    expect(lld[0].end.x - lld[0].start.x).toBe(150);
  });

  it('sizes AVT reference guides from target/reference extents and supports all current layouts', () => {
    const corners = [
      { x: 100, y: 100 },
      { x: 150, y: 110 },
      { x: 110, y: 200 },
      { x: 160, y: 210 },
    ];
    for (const referenceLine of ['c7pl', 'csvl'] as const) {
      for (const target of [
        { type: 'vertebra', vertebra: 'T4' },
        { type: 'disc', upperVertebra: 'T12', lowerVertebra: 'L1' },
      ] as const) {
        const p = [
          ...(target.type === 'vertebra' ? corners : corners.slice(0, 2)),
          ...(referenceLine === 'c7pl'
            ? corners.map(p => ({ x: p.x + 200, y: p.y - 100 }))
            : points.slice(2)),
        ];
        const drawing = buildAvtDrawing({
          id: 'avt',
          type: 'avt',
          value: '',
          points: p,
          avtMetadata: { schemaVersion: 2, target, referenceLine },
        });
        const lines = line(drawing),
          guide = lines.find(p => p.dash === '3,3')!;
        const min = Math.min(...p.map(p => p.y)),
          max = Math.max(...p.map(p => p.y));
        expect(guide.start.y).toBe(min - Math.max(24, (max - min) * 0.2));
        expect(guide.end.y).toBe(max + Math.max(24, (max - min) * 0.2));
        const connector = lines[lines.length - 1];
        expect(connector.start.y).toBe(connector.end.y);
        expect(connector.end.x).toBe(guide.start.x);
      }
    }
    expect(
      buildAvtDrawing({
        id: 'legacy',
        type: 'avt',
        value: '',
        points: points.slice(0, 2),
      })
    ).not.toHaveLength(0);
  });

  it('anchors tilt references at the left endpoint and includes arc extents in drawing bounds', () => {
    const drawing = buildMeasurementDrawing('t1-tilt', [
      points[1],
      { x: 100, y: 90 },
    ]);
    const lines = line(drawing);
    expect(lines[1]).toMatchObject({
      start: { x: 0, y: 90 },
      end: { x: 200, y: 90 },
    });
    const arc = drawing.find(p => p.kind === 'arc')!;
    expect(arc).toMatchObject({ center: { x: 100, y: 90 }, radius: 30 });
    expect(drawingBoundsPoints([arc])).toEqual([
      { x: 70, y: 60 },
      { x: 130, y: 120 },
    ]);
  });
});
