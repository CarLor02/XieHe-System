import { describe, expect, it, vi } from 'vitest';
import type { ImageFileResponse } from '@xiehe/api-contracts/generated';
import { ApiClientError } from '@xiehe/api-client';
import {
  createAnnotationDocument,
  decodeAnnotationDocument,
  type AnnotationDocument,
} from '@xiehe/imaging-core/annotation-document';
import {
  createEmptyBindings,
  createManualPointRef,
} from '@xiehe/imaging-core/bindings';
import {
  AnnotationSource,
  type MeasurementData,
  type Point,
} from '@xiehe/imaging-core/contracts';
import { ImageEditorSession } from './ImageEditorSession';
import type { ImageEditorGateway } from './ports';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
import { CanvasInteraction } from '../components/interaction/CanvasInteraction';

function image(
  annotation: AnnotationDocument | null,
  overrides: Partial<ImageFileResponse> = {}
): ImageFileResponse {
  return {
    id: 42,
    annotation: annotation as unknown as ImageFileResponse['annotation'],
    annotation_version: 7,
    created_at: '2026-10-21T00:00:00Z',
    description: '正位X光片',
    file_type: 'PNG',
    file_uuid: 'test-image',
    file_size: 100,
    has_annotation: !!annotation,
    mime_type: 'image/png',
    object_key: 'test.png',
    original_filename: 'test.png',
    patient_id: null,
    status: 'PROCESSED',
    storage_bucket: 'test',
    storage_etag: null,
    study_date: null,
    thumbnail_path: null,
    upload_progress: 100,
    uploaded_at: null,
    uploaded_by: 1,
    ...overrides,
  };
}
const points = [
  { x: 100, y: 100 },
  { x: 300, y: 120 },
  { x: 120, y: 300 },
  { x: 320, y: 320 },
  { x: 100, y: 600 },
  { x: 300, y: 620 },
  { x: 150, y: 800 },
  { x: 350, y: 820 },
  { x: 200, y: 1000 },
  { x: 400, y: 1020 },
];
function document(measurements: MeasurementData[] = []) {
  return createAnnotationDocument({
    measurements,
    imageWidth: 1000,
    imageHeight: 2000,
    standardDistance: 100,
    standardDistancePoints: [
      { x: 100, y: 1800 },
      { x: 300, y: 1800 },
    ],
    pointBindings: createEmptyBindings(),
    reportText: '已有报告',
    savedAt: '2026-10-20T00:00:00Z',
  });
}
async function setup(source = image(document()), thumbnail = false) {
  const gateway = {
    measure: vi
      .fn<ImageEditorGateway['measure']>()
      .mockResolvedValue({ measurements: [] }),
    generate: vi
      .fn<ImageEditorGateway['generate']>()
      .mockResolvedValue({ report: '生成报告' }),
    getImage: vi.fn<ImageEditorGateway['getImage']>().mockResolvedValue(source),
    getPreview: vi
      .fn<ImageEditorGateway['getPreview']>()
      .mockResolvedValue({ uri: 'test://image', isThumbnail: thumbnail }),
    save: vi
      .fn<ImageEditorGateway['save']>()
      .mockResolvedValue({ annotation_version: 8 }),
  };
  const session = new ImageEditorSession(42, gateway);
  await session.load();
  session.imageLoaded({
    width: thumbnail ? 200 : 1000,
    height: thumbnail ? 400 : 2000,
  });
  return { session, gateway };
}
function draw(session: ImageEditorSession, type: string, supplied: Point[]) {
  session.chooseTool(type);
  supplied.forEach(point => session.placePoint(point, 1));
}

describe('mobile image editing workflow', () => {
  it('isolates preview subscribers, keeps the immutable baseline and flushes the final gesture coordinate', async () => {
    const { session, gateway } = await setup(
      image(
        document([
          {
            id: 'line',
            type: 'aux-length',
            value: '100mm',
            points: points.slice(0, 2),
          },
          {
            id: 'other',
            type: 'aux-length',
            value: '旧值',
            points: points.slice(4, 6),
          },
        ])
      )
    );
    const before = session.snapshot!;
    const freeze = (value: object) => {
      Object.values(value).forEach(child => {
        if (child && typeof child === 'object') freeze(child);
      });
      Object.freeze(value);
    };
    freeze(before);
    const interaction = new CanvasInteraction(session);
    const context = {
      imageScale: 2,
      imagePosition: { x: 40, y: 80 },
      imageNaturalSize: { width: 1000, height: 2000 },
      containerSize: { width: 400, height: 800 },
    };
    const start = imageToScreen(points[0], context);
    const plan = interaction.begin(
      1,
      { ...start, translationX: 0, translationY: 0 },
      context
    );
    expect(plan.kind).toBe('annotation');
    const screenState = session.getScreenState();
    const screenListener = vi.fn(),
      previewListener = vi.fn();
    session.subscribeScreen(screenListener);
    session.subscribe(previewListener);
    interaction.move(1, {
      ...start,
      x: start.x + 8,
      translationX: 8,
      translationY: 0,
    });
    expect(session.getScreenState()).toBe(screenState);
    expect(screenListener).not.toHaveBeenCalled();
    expect(previewListener).toHaveBeenCalledOnce();
    interaction.move(1, {
      ...start,
      x: start.x + 8,
      translationX: 8,
      translationY: 0,
    });
    expect(previewListener).toHaveBeenCalledOnce();
    expect(session.snapshot?.measurements[1]).toBe(before.measurements[1]);
    expect(before.measurements[0].points[0]).toEqual(points[0]);
    interaction.end(1, {
      ...start,
      x: start.x + 16,
      translationX: 16,
      translationY: 0,
    });
    expect(session.snapshot?.measurements[0].points[0]).toEqual({
      x: 120,
      y: 100,
    });
    expect(session.getState().history?.past).toHaveLength(1);
    expect(session.getScreenState().dragging).toBe(false);
    const ended = session.snapshot;
    interaction.move(1, {
      ...start,
      x: 999,
      translationX: 999,
      translationY: 0,
    });
    expect(session.snapshot).toBe(ended);
    expect(gateway.save).not.toHaveBeenCalled();
    session.undo();
    expect(session.snapshot).toEqual(before);
    session.redo();
    expect(session.snapshot).toEqual(ended);
    await session.save();
    expect(
      gateway.save.mock.calls[0][0].annotation.measurements?.[0].points[0]
    ).toEqual({ x: 120, y: 100 });
  });

  it('cancels an interrupted gesture and ignores its late frames after the next gesture or disposal', async () => {
    const { session } = await setup(
      image(
        document([
          {
            id: 'line',
            type: 'aux-length',
            value: '',
            points: points.slice(0, 2),
          },
        ])
      )
    );
    const before = structuredClone(session.snapshot);
    const interaction = new CanvasInteraction(session);
    const context = {
      imageScale: 1,
      imagePosition: { x: 0, y: 0 },
      imageNaturalSize: { width: 1000, height: 2000 },
      containerSize: { width: 1000, height: 2000 },
    };
    const sample = { ...points[0], translationX: 0, translationY: 0 };
    interaction.begin(1, sample, context);
    interaction.move(1, { ...sample, x: 180 });
    interaction.cancel(1);
    interaction.end(1, { ...sample, x: 190 });
    expect(session.snapshot).toEqual(before);
    expect(session.getState().history?.past).toHaveLength(0);
    interaction.begin(2, sample, context);
    interaction.move(2, { ...sample, x: 160 });
    const current = session.snapshot;
    interaction.cancel(1);
    interaction.move(1, { ...sample, x: 999 });
    expect(session.snapshot).toBe(current);
    interaction.dispose();
    interaction.move(2, { ...sample, x: 999 });
    interaction.end(2, { ...sample, x: 999 });
    expect(session.snapshot).toEqual(before);
  });

  it('completes a short viewport pan even if release precedes the UI hit-test response', async () => {
    const { session } = await setup();
    const interaction = new CanvasInteraction(session);
    const context = {
      imageScale: 1.5,
      imagePosition: { x: 15, y: -20 },
      imageNaturalSize: { width: 1000, height: 2000 },
      containerSize: { width: 400, height: 800 },
    };
    const sample = { x: 200, y: 100, translationX: 0, translationY: 0 };
    expect(interaction.begin(1, sample, context).kind).toBe('viewport');
    expect(
      interaction.end(1, {
        ...sample,
        x: 222,
        y: 112,
        translationX: 22,
        translationY: 12,
      })
    ).toEqual({ imageScale: 1.5, imagePosition: { x: 37, y: -8 } });
    expect(session.getState().history?.past).toHaveLength(0);
  });

  it('flushes the final shape preview and cancels an interrupted shape without a history entry', async () => {
    const { session } = await setup();
    const interaction = new CanvasInteraction(session);
    const context = {
      imageScale: 1,
      imagePosition: { x: 0, y: 0 },
      imageNaturalSize: { width: 1000, height: 2000 },
      containerSize: { width: 1000, height: 2000 },
    };
    session.chooseTool('rectangle');
    const start = { x: 100, y: 200, translationX: 0, translationY: 0 };
    expect(interaction.begin(1, start, context).kind).toBe('shape');
    interaction.move(1, { ...start, x: 200, y: 300 });
    interaction.cancel(1);
    expect(session.getState().drawingPreview).toEqual([]);
    expect(session.getState().history?.past).toHaveLength(0);
    interaction.begin(2, start, context);
    interaction.move(2, { ...start, x: 200, y: 300 });
    interaction.end(2, { ...start, x: 400, y: 500 });
    expect(session.snapshot?.measurements[0].points).toEqual([
      { x: 100, y: 200 },
      { x: 400, y: 500 },
    ]);
    expect(session.getState().history?.past).toHaveLength(1);
    expect(session.getState().drawing).toBeNull();
    session.undo();
    expect(session.snapshot?.measurements).toEqual([]);
  });

  it('propagates existing manual point bindings and preserves unrelated stored values', async () => {
    const first: MeasurementData = {
      id: 'a',
      type: 'aux-length',
      value: '100mm',
      points: points.slice(0, 2),
    };
    const second: MeasurementData = {
      id: 'b',
      type: 'aux-length',
      value: '100mm',
      points: points.slice(0, 2),
    };
    const unrelated: MeasurementData = {
      id: 'legacy',
      type: 'cobb1',
      value: 'AI历史值',
      points: points.slice(0, 4),
    };
    const source = document([first, second, unrelated]);
    source.pointBindings = {
      schemaVersion: 2,
      syncGroups: [
        {
          id: 'manual',
          name: '共享点',
          source: 'manual',
          color: '#FF0000',
          members: [
            createManualPointRef(first, 0)!,
            createManualPointRef(second, 0)!,
          ],
        },
      ],
    };
    const { session, gateway } = await setup(image(source));
    session.beginDrag({ kind: 'point', measurementId: 'a', pointIndex: 0 });
    session.moveDrag({ x: 130, y: 160 });
    session.endDrag();
    expect(session.snapshot?.measurements[1].points[0]).toEqual({
      x: 130,
      y: 160,
    });
    expect(session.snapshot?.measurements[2].value).toBe('AI历史值');
    expect(await session.save()).toBe(true);
    expect(gateway.save.mock.calls[0][0].annotation.pointBindings).toEqual(
      source.pointBindings
    );
  });

  it('writes explicitly selected lateral Cobb endpoints back to the correct keypoints', async () => {
    const { session } = await setup(
      image(document(), { description: '侧位X光片' })
    );
    session.chooseTool('lateral-cobb', {
      cobbEndpoints: { upperVertebra: 'T2', lowerVertebra: 'T5' },
    });
    points.slice(0, 4).forEach(point => session.placePoint(point, 1));
    const measurement = session.snapshot!.measurements[0];
    expect(measurement).toMatchObject({
      upperVertebra: 'T2',
      lowerVertebra: 'T5',
    });
    session.beginDrag({
      kind: 'point',
      measurementId: measurement.id,
      pointIndex: 2,
    });
    session.moveDrag({ x: 150, y: 350 });
    session.endDrag();
    expect(
      session.snapshot?.keypoints.find(k => k.id === 'T5-3')?.point
    ).toEqual({ x: 150, y: 350 });
  });

  it('reads server annotation and saves original coordinates over a smaller thumbnail', async () => {
    const source = document([
      {
        id: 'existing',
        type: 'Cobb1',
        value: '10°',
        points: points.slice(0, 4),
      },
    ]);
    source.vertebraeLayer = [
      {
        label: 'C7',
        corners: points.slice(0, 4) as [Point, Point, Point, Point],
        confidence: 0.9,
        source: AnnotationSource.AI,
      },
    ];
    const { session, gateway } = await setup(
      image(source, { file_type: 'TIFF' }),
      true
    );
    expect(session.getState().imageSize).toEqual({ width: 1000, height: 2000 });
    const before = session.snapshot!;
    draw(session, 'aux-length', [
      { x: 400, y: 1200 },
      { x: 500, y: 1200 },
    ]);
    expect(session.getState().dirty).toBe(true);
    expect(await session.save()).toBe(true);
    const input = gateway.save.mock.calls[0][0];
    expect(input.expectedVersion).toBe(7);
    expect(input.annotation.imageWidth).toBe(1000);
    expect(input.annotation.imageHeight).toBe(2000);
    expect(
      input.annotation.measurements.find(m => m.id === 'existing')?.points
    ).toEqual(before.measurements[0].points);
    expect(input.annotation.measurements.at(-1)?.points).toEqual([
      { x: 400, y: 1200 },
      { x: 500, y: 1200 },
    ]);
    expect(input.annotation.vertebraeLayer).toEqual(before.vertebraeLayer);
    expect(input.annotation.reportText).toBe('已有报告');
    expect(session.getState()).toMatchObject({
      annotationVersion: 8,
      dirty: false,
      saving: false,
    });
    const reopened = await setup(
      image(input.annotation, { annotation_version: 8 })
    );
    expect(reopened.session.snapshot?.measurements).toEqual(
      input.annotation.measurements
    );
  });

  it('records an entire point drag as one undoable change and cancels interrupted drags', async () => {
    const { session } = await setup(
      image(
        document([
          {
            id: 'line',
            type: 'aux-length',
            value: '100mm',
            points: points.slice(0, 2),
          },
        ])
      )
    );
    const before = structuredClone(session.snapshot);
    session.beginDrag({ kind: 'point', measurementId: 'line', pointIndex: 0 });
    for (let x = 101; x < 120; x++) session.moveDrag({ x, y: 150 });
    session.endDrag();
    expect(session.getState().history?.past).toHaveLength(1);
    expect(session.snapshot?.measurements[0].points[0]).toEqual({
      x: 119,
      y: 150,
    });
    session.undo();
    expect(session.snapshot).toEqual(before);
    expect(session.getState().dirty).toBe(false);
    session.redo();
    expect(session.snapshot?.measurements[0].points[0]).toEqual({
      x: 119,
      y: 150,
    });
    const moved = structuredClone(session.snapshot);
    session.beginDrag({ kind: 'point', measurementId: 'line', pointIndex: 0 });
    session.moveDrag({ x: 500, y: 500 });
    session.cancelDrag();
    expect(session.snapshot).toEqual(moved);
    expect(session.getState().history?.past).toHaveLength(1);
  });

  it('synchronizes an edited medical point with its keypoint and reopens with the same geometry', async () => {
    const { session, gateway } = await setup(
      image(
        document([
          {
            id: 't1',
            type: 't1-tilt',
            value: '5°',
            points: points.slice(0, 2),
            keypointSynced: true,
          },
        ])
      )
    );
    session.beginDrag({ kind: 'point', measurementId: 't1', pointIndex: 0 });
    session.moveDrag({ x: 120, y: 150 });
    session.endDrag();
    expect(
      session.snapshot?.keypoints.find(k => k.id === 'T1-1')?.point
    ).toEqual({ x: 120, y: 150 });
    expect(session.snapshot?.measurements[0].value).not.toBe('5°');
    expect(await session.save()).toBe(true);
    const saved = gateway.save.mock.calls[0][0].annotation;
    const reopened = await setup(image(saved));
    expect(reopened.session.snapshot?.measurements[0].points).toEqual(
      session.snapshot?.measurements[0].points
    );
    expect(
      reopened.session.snapshot?.keypoints.find(k => k.id === 'T1-1')?.point
    ).toEqual({ x: 120, y: 150 });
  });

  it('keeps drafts separate from saved facts and rejects incomplete drawing saves', async () => {
    const { session, gateway } = await setup();
    const before = structuredClone(session.snapshot);
    session.chooseTool('cobb');
    session.placePoint(points[0], 1);
    expect(await session.save()).toBe(false);
    expect(gateway.save).not.toHaveBeenCalled();
    session.cancelDrawing();
    expect(session.snapshot).toEqual(before);
    expect(session.getState().dirty).toBe(false);
    expect(session.getState().history?.past).toHaveLength(0);
  });

  it.each([
    ['T2', 8, 'c7pl'],
    ['T12', 6, 'csvl'],
  ] as const)(
    'uses the shared AVT placement sequence for %s',
    async (vertebra, clicks, reference) => {
      const { session } = await setup();
      session.chooseTool('avt', { avtTarget: { type: 'vertebra', vertebra } });
      for (let index = 0; index < clicks; index++)
        session.placePoint(points[index], 1);
      expect(session.getState().drawing).toBeNull();
      expect(session.snapshot?.measurements[0]).toMatchObject({
        type: 'avt',
        avtMetadata: {
          schemaVersion: 2,
          target: { type: 'vertebra', vertebra },
          referenceLine: reference,
        },
      });
      expect(session.getState().history?.past).toHaveLength(1);
      session.chooseTool('avt', { avtTarget: { type: 'vertebra', vertebra } });
      expect(session.getState().drawing).toBeNull();
      expect(session.snapshot?.measurements).toHaveLength(1);
      session.undo();
      expect(session.snapshot?.keypoints).toHaveLength(0);
    }
  );

  it('closes a polygon and constrains auxiliary lines using shared rules', async () => {
    const { session } = await setup();
    draw(session, 'polygon', [...points.slice(0, 3), points[0]]);
    expect(session.snapshot?.measurements[0].points).toHaveLength(3);
    draw(session, 'aux-horizontal-line', [
      { x: 50, y: 60 },
      { x: 300, y: 220 },
    ]);
    expect(session.snapshot?.measurements[1].points[1]).toEqual({
      x: 300,
      y: 60,
    });
    const id = session.snapshot!.measurements[1].id;
    session.beginDrag({ kind: 'point', measurementId: id, pointIndex: 1 });
    session.moveDrag({ x: 500, y: 300 });
    session.endDrag();
    expect(session.snapshot?.measurements[1].points[1]).toEqual({
      x: 500,
      y: 60,
    });
  });

  it('keeps a unique measurement unique and selects the existing instance', async () => {
    const { session } = await setup(
      image(
        document([
          { id: 'ca', type: 'ca', value: '2°', points: points.slice(0, 2) },
        ])
      )
    );
    session.chooseTool('ca');
    expect(session.getState().drawing).toBeNull();
    expect(session.getState().selection).toMatchObject({ measurementId: 'ca' });
    expect(session.snapshot?.measurements).toHaveLength(1);
  });

  it('recalculates calibrated distances without changing the drawing geometry', async () => {
    const { session } = await setup();
    draw(session, 'aux-length', [
      { x: 400, y: 1200 },
      { x: 500, y: 1200 },
    ]);
    expect(session.snapshot?.measurements[0].value).toBe('50.00mm');
    session.setStandardDistance('200');
    expect(session.snapshot?.measurements[0].value).toBe('100.00mm');
    const originalPoints = structuredClone(
      session.snapshot?.measurements[0].points
    );
    draw(session, 'calibration', [
      { x: 100, y: 1600 },
      { x: 500, y: 1600 },
    ]);
    expect(session.snapshot?.measurements[0].value).toBe('50.00mm');
    expect(session.snapshot?.measurements[0].points).toEqual(originalPoints);
    session.undo();
    expect(session.snapshot?.measurements[0].value).toBe('100.00mm');
  });

  it('supports bilateral pelvis and keeps PI/PT geometry together when a radius changes', async () => {
    const { session } = await setup(
      image(document(), { description: '侧位X光片' })
    );
    session.chooseTool('pi', { pelvicMode: 'bilateral' });
    points.slice(0, 6).forEach(p => session.placePoint(p, 1));
    expect(
      session.snapshot?.measurements[0].pelvicMetadata?.femoralHeadMode
    ).toBe('bilateral');
    session.chooseTool('pt', { pelvicMode: 'bilateral' });
    expect(session.getState().drawing).toBeNull();
    expect(session.snapshot?.measurements).toHaveLength(2);
    const id = session.snapshot!.measurements[0].id;
    session.beginDrag({ kind: 'point', measurementId: id, pointIndex: 1 });
    session.moveDrag({ x: 350, y: 150 });
    session.endDrag();
    expect(session.snapshot?.measurements[0].points).toEqual(
      session.snapshot?.measurements[1].points
    );
    session.select({ kind: 'whole', measurementId: id });
    session.deleteSelected();
    expect(session.snapshot?.measurements).toHaveLength(0);
    session.undo();
    expect(session.snapshot?.measurements).toHaveLength(2);
  });

  it('retains a failed or conflicting save and never retries with a newer version automatically', async () => {
    const { session, gateway } = await setup();
    draw(session, 'aux-length', points.slice(0, 2));
    gateway.save.mockRejectedValueOnce(
      new ApiClientError('service unavailable', { status: 503 })
    );
    expect(await session.save()).toBe(false);
    expect(session.getState()).toMatchObject({
      annotationVersion: 7,
      dirty: true,
      saving: false,
      conflict: false,
    });
    gateway.save.mockRejectedValueOnce(
      new ApiClientError('conflict', { status: 409 })
    );
    expect(await session.save()).toBe(false);
    expect(session.getState()).toMatchObject({
      annotationVersion: 7,
      dirty: true,
      saving: false,
      conflict: true,
    });
    expect(await session.save()).toBe(false);
    expect(gateway.save).toHaveBeenCalledTimes(2);
    expect(session.snapshot?.measurements).toHaveLength(1);
  });

  it('blocks concurrent edits and duplicate saves while a server save is pending', async () => {
    const { session, gateway } = await setup();
    draw(session, 'aux-length', points.slice(0, 2));
    let finish!: (result: { annotation_version: number }) => void;
    gateway.save.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const saving = session.save();
    expect(await session.save()).toBe(false);
    session.clear();
    expect(session.snapshot?.measurements).toHaveLength(1);
    finish({ annotation_version: 9 });
    await saving;
    expect(gateway.save).toHaveBeenCalledTimes(1);
    expect(session.getState()).toMatchObject({
      annotationVersion: 9,
      dirty: false,
    });
  });

  it('refuses unknown document versions and thumbnails without original dimensions', async () => {
    const invalid = image(null);
    invalid.annotation = { schemaVersion: 999, measurements: [] };
    const first = await setup(invalid);
    expect(first.session.getState().status).toBe('error');
    const legacy = document();
    delete legacy.imageWidth;
    delete legacy.imageHeight;
    const second = await setup(image(legacy, { file_type: 'TIFF' }), true);
    expect(second.session.editable).toBe(false);
    expect(await second.session.save()).toBe(false);
    expect(second.gateway.save).not.toHaveBeenCalled();
    expect(
      decodeAnnotationDocument(second.session.getState().image?.annotation)
        ?.imageWidth
    ).toBeUndefined();
  });

  it('ignores a completed load after the screen session has been cancelled', async () => {
    let resolve!: (value: ImageFileResponse) => void;
    const gateway: ImageEditorGateway = {
      measure: vi.fn(),
      generate: vi.fn(),
      getImage: () =>
        new Promise(r => {
          resolve = r;
        }),
      getPreview: async () => ({ uri: 'test://image', isThumbnail: false }),
      save: vi.fn(),
    };
    const session = new ImageEditorSession(42, gateway);
    const pending = session.load();
    session.cancelPending();
    resolve(image(document()));
    await pending;
    expect(session.getState().status).toBe('loading');
    expect(session.snapshot).toBeNull();
  });
});

describe('AI and report application workflow', () => {
  const prediction = {
    imageId: '42',
    imageWidth: 1000,
    imageHeight: 2000,
    measurements: [
      {
        type: 'CA',
        points: [
          { x: 100, y: 200 },
          { x: 300, y: 210 },
        ],
        value: '2.86°',
      },
    ],
  };
  it('applies real AI data as one undoable draft and saves the generated report with the document version', async () => {
    const { session, gateway } = await setup();
    gateway.measure.mockResolvedValue(prediction);
    expect(await session.analyze()).toBe(true);
    expect(session.snapshot?.measurements[0].value).toBe('2.86°');
    expect(gateway.save).not.toHaveBeenCalled();
    session.undo();
    expect(session.snapshot?.measurements).toEqual([]);
    expect(session.getState().dirty).toBe(false);
    session.redo();
    expect(await session.generateReport()).toBe(true);
    expect(gateway.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        imageId: '42',
        measurements: [expect.objectContaining({ value: '2.86°' })],
      })
    );
    session.undo();
    expect(session.getState().dirty).toBe(true); // Report changes survive measurement undo.
    session.redo();
    expect(await session.save()).toBe(true);
    expect(gateway.save).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 7,
        annotation: expect.objectContaining({ reportText: '生成报告' }),
      })
    );
    expect(session.getState().dirty).toBe(false);
  });
  it('keeps annotations and report when AI or report generation fails', async () => {
    const { session, gateway } = await setup();
    const before = session.snapshot;
    gateway.measure.mockRejectedValue(new Error('AI unavailable'));
    expect(await session.analyze()).toBe(false);
    expect(session.snapshot).toEqual(before);
    expect(session.getState().working).toBeNull();
    gateway.measure.mockResolvedValue(prediction);
    await session.analyze();
    gateway.generate.mockRejectedValue(new Error('report unavailable'));
    expect(await session.generateReport()).toBe(false);
    expect(session.getState().reportText).toBe('已有报告');
    expect(gateway.save).not.toHaveBeenCalled();
  });
  it('blocks edits and duplicate AI requests while pending and ignores the result after reload', async () => {
    const { session, gateway } = await setup();
    let finish!: (value: typeof prediction) => void;
    gateway.measure.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const pending = session.analyze();
    expect(session.editable).toBe(false);
    expect(await session.analyze()).toBe(false);
    expect(await session.save()).toBe(false);
    await session.load();
    finish(prediction);
    expect(await pending).toBe(false);
    expect(session.snapshot?.measurements).toEqual([]);
  });
  it('uses model original dimensions to initialize a TIFF document, never thumbnail dimensions', async () => {
    const legacy = document();
    delete legacy.imageWidth;
    delete legacy.imageHeight;
    const { session, gateway } = await setup(
      image(legacy, { file_type: 'TIFF' }),
      true
    );
    expect(session.editable).toBe(false);
    gateway.measure.mockResolvedValue(prediction);
    expect(await session.analyze()).toBe(true);
    expect(session.editable).toBe(true);
    expect(await session.save()).toBe(true);
    expect(gateway.save).toHaveBeenCalledWith(
      expect.objectContaining({
        annotation: expect.objectContaining({
          imageWidth: 1000,
          imageHeight: 2000,
        }),
      })
    );
  });
});

describe('manual binding application', () => {
  it('merges chosen points using the last anchor, persists and undoes the binding atomically', async () => {
    const measurements: MeasurementData[] = [
      {
        id: 'a',
        type: 'distance',
        points: [
          { x: 10, y: 20 },
          { x: 50, y: 20 },
        ],
        value: '20mm',
      },
      {
        id: 'b',
        type: 'distance',
        points: [
          { x: 100, y: 120 },
          { x: 200, y: 120 },
        ],
        value: '50mm',
      },
    ];
    const { session, gateway } = await setup(image(document(measurements)));
    expect(
      session.bindPoints([
        { annotationId: 'a', pointIndex: 0 },
        { annotationId: 'b', pointIndex: 0 },
      ])
    ).toBe(true);
    expect(session.snapshot?.measurements[0].points[0]).toEqual({
      x: 100,
      y: 120,
    });
    expect(session.snapshot?.pointBindings.syncGroups).toHaveLength(1);
    session.undo();
    expect(session.snapshot?.measurements[0].points[0]).toEqual({
      x: 10,
      y: 20,
    });
    expect(session.snapshot?.pointBindings.syncGroups).toEqual([]);
    session.redo();
    await session.save();
    expect(
      gateway.save.mock.calls[0][0].annotation.pointBindings
    ).toMatchObject({
      syncGroups: [
        {
          members: [
            expect.objectContaining({ annotationId: 'a' }),
            expect.objectContaining({ annotationId: 'b' }),
          ],
        },
      ],
    });
    session.removeBinding();
    expect(session.snapshot?.pointBindings.syncGroups).toEqual([]);
  });
});
