import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { runAiMeasurement } from '@xiehe/imaging-core/ai';
import {
  runAnnotationSave,
  type AnnotationDocument,
} from '@xiehe/imaging-core/annotation-document';
import { createEmptyBindings } from '@xiehe/imaging-core/bindings';
import {
  AnnotationSource,
  type MeasurementData,
  type Point,
} from '@xiehe/imaging-core/contracts';
import { prepareStudyEditorState } from '@xiehe/imaging-core/editor';
import { keypointsToPersistedLayer } from '@xiehe/imaging-core/keypoints';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@xiehe/imaging-catalog/annotations';
import { measurementValueCalculator } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { useMeasurementKeypointWorkflow } from './useMeasurementKeypointWorkflow';

const context = {
  standardDistance: null,
  standardDistancePoints: [],
  imageNaturalSize: { width: 1000, height: 1000 },
};
const points = [
  { x: 100, y: 100 },
  { x: 200, y: 110 },
  { x: 120, y: 300 },
  { x: 220, y: 280 },
];

function layerFor(ids: string[]) {
  return keypointsToPersistedLayer(
    ids.map((id, index) => ({
      id,
      point: points[index],
      source: AnnotationSource.AI,
      confidence: 0.9,
    }))
  );
}

function openEditor(examType: string, annotation: unknown) {
  const prepared = prepareStudyEditorState({
    source: {
      id: 7,
      file_uuid: 'fixture-7',
      file_type: 'PNG',
      description: examType,
      status: 'PROCESSED',
      created_at: '2026-11-01T00:00:00Z',
      annotation_version: 1,
      annotation,
    },
    normalizeMeasurementType: getAnnotationTypeId,
  });
  const editor = renderHook(() => {
    const [measurements, setMeasurements] = useState(prepared.measurements);
    const workflow = useMeasurementKeypointWorkflow({
      imageId: '7',
      examType,
      imageNaturalSize: context.imageNaturalSize,
      measurements,
      setMeasurements,
      standardDistance: null,
      calculationContext: context,
      canUseKeypoints: true,
      isLateralView: examType === '侧位X光片',
      isKeypointExam: true,
      setSaveMessage: jest.fn(),
      setShowStandardDistanceWarning: jest.fn(),
    });
    return { measurements, workflow };
  });
  act(() =>
    editor.result.current.workflow.applyHydratedKeypointState(
      prepared.keypointState
    )
  );
  return editor;
}

async function saveEditor(editor: ReturnType<typeof openEditor>) {
  let stored: AnnotationDocument | undefined;
  const { measurements, workflow } = editor.result.current;
  await runAnnotationSave({
    imageId: 7,
    expectedVersion: 1,
    snapshot: {
      ...context,
      measurements,
      pointBindings: createEmptyBindings(),
      reportText: '',
      vertebraeLayer: workflow.activeVertebraeLayer,
      cfhAnnotation: workflow.cfhAnnotation,
      savedAt: '2026-11-01T00:00:00Z',
    },
    // HTTP 的布尔值保真由后端真实路由测试覆盖；此处验证编辑器跨会话的持久化契约。
    port: {
      save: async ({ annotation }) => {
        stored = JSON.parse(JSON.stringify(annotation)) as AnnotationDocument;
        return { annotation_version: 2 };
      },
    },
  });
  return stored!;
}

function moveKeypoint(
  editor: ReturnType<typeof openEditor>,
  id: string,
  point: Point
) {
  act(() =>
    editor.result.current.workflow.handleVertebraeUpdate(
      editor.result.current.workflow.activeVertebraeLayer.map(item =>
        item.label === id
          ? { ...item, corners: [point, point, point, point] }
          : item
      )
    )
  );
}

function moveCobb(
  editor: ReturnType<typeof openEditor>,
  index: number,
  point: Point
) {
  const measurement = editor.result.current.measurements.find(item =>
    /cobb/i.test(item.type)
  )!;
  const updated = {
    ...measurement,
    points: measurement.points.map((p, i) => (i === index ? point : p)),
  };
  let handled = false;
  act(() => {
    handled = editor.result.current.workflow.handleMeasurementWriteback(
      updated.type,
      index,
      point,
      updated.id,
      updated.points,
      editor.result.current.measurements.map(item =>
        item.id === updated.id ? updated : item
      )
    );
  });
  return handled;
}

describe.each(['正位X光片', '左侧曲位', '右侧曲位', '侧位X光片'])(
  '%s Cobb 跨会话同步',
  examType => {
    it.each([false, true])(
      'AI 测量、保存、重开后保持双向联动（旧数字标记=%s）',
      async legacy => {
        const result = await runAiMeasurement({
          imageId: 7,
          examType,
          actualImageSize: context.imageNaturalSize,
          port: {
            measure: async () => ({
              measurements: [
                {
                  type: 'Cobb-Auto1',
                  value: '17.02°',
                  points,
                  upper_vertebra: 'T1',
                  lower_vertebra: 'L5',
                },
              ],
              vertebrae: layerFor(['T1-1', 'T1-2', 'L5-3', 'L5-4']),
            }),
          },
          resolveTool: type => {
            const tool = getAnnotationConfig(type);
            return tool
              ? {
                  id: tool.id,
                  pointsNeeded: tool.pointsNeeded,
                  category:
                    tool.category === 'measurement' ? 'measurement' : 'support',
                }
              : null;
          },
          calculateValue: (type, p) =>
            measurementValueCalculator.calculateType(type, p, context),
          describeType: () => 'Cobb',
          createId: () => 'ai-cobb-7',
        });
        expect(result.status).toBe('ready');
        if (result.status !== 'ready') throw new Error('AI fixture invalid');
        expect(result.state.measurements[0].keypointSynced).toBe(true);

        const first = openEditor(examType, {
          measurements: result.state.measurements,
          vertebraeLayer: result.state.vertebraeLayer,
        });
        const beforeSave = { x: 85, y: 65 };
        moveKeypoint(first, 'T1-1', beforeSave);
        expect(first.result.current.measurements[0].points[0]).toEqual(
          beforeSave
        );
        const saved = await saveEditor(first);
        expect(saved.measurements[0].keypointSynced).toBe(true);
        first.unmount();

        const reopened = openEditor(examType, {
          ...saved,
          measurements: saved.measurements.map(item => ({
            ...item,
            keypointSynced: legacy ? 1 : true,
          })),
        });
        expect(reopened.result.current.measurements[0].keypointSynced).toBe(
          true
        );
        const fromKeypoint = { x: 70, y: 50 };
        moveKeypoint(reopened, 'T1-1', fromKeypoint);
        expect(reopened.result.current.measurements[0].points[0]).toEqual(
          fromKeypoint
        );
        const fromCobb = { x: 250, y: 320 };
        expect(moveCobb(reopened, 3, fromCobb)).toBe(true);
        expect(
          reopened.result.current.workflow.keypoints.find(k => k.id === 'L5-4')
        ).toMatchObject({
          point: fromCobb,
          source: AnnotationSource.MANUAL,
        });
        expect(reopened.result.current.measurements[0]).toMatchObject({
          id: 'ai-cobb-7',
          type: saved.measurements[0].type,
          keypointSynced: true,
          points: [fromKeypoint, points[1], points[2], fromCobb],
        });
        const resaved = await saveEditor(reopened);
        reopened.unmount();
        const final = openEditor(examType, resaved);
        expect(final.result.current.measurements[0].points[3]).toEqual(
          fromCobb
        );
        expect(final.result.current.measurements[0].keypointSynced).toBe(true);
        final.unmount();
      }
    );
  }
);

it('侧位 Cobb 写回 S1 上终板，并更新共享 S1 的 SS 测量', () => {
  const cobb: MeasurementData = {
    id: 'side',
    type: 'lateral-cobb1',
    value: '',
    points,
    upperVertebra: 'T12',
    lowerVertebra: 'S1',
    keypointSynced: true,
  };
  const editor = openEditor('侧位X光片', {
    measurements: [
      cobb,
      {
        id: 'ss',
        type: 'ss',
        value: '',
        points: points.slice(2),
        keypointSynced: true,
      },
    ],
    vertebraeLayer: layerFor(['T12-1', 'T12-2', 'S1-1', 'S1-2']),
  });
  const moved = { x: 90, y: 270 };
  expect(moveCobb(editor, 2, moved)).toBe(true);
  expect(
    editor.result.current.workflow.keypoints.find(k => k.id === 'S1-1')?.point
  ).toEqual(moved);
  expect(
    editor.result.current.measurements.find(m => m.type === 'ss')?.points
  ).toContainEqual(moved);
  expect(
    editor.result.current.workflow.keypoints.some(k => k.id === 'S1-3')
  ).toBe(false);
  editor.unmount();
});

it('侧位待定端椎保留未绑定控制点，只写回已知端椎', () => {
  const editor = openEditor('侧位X光片', {
    measurements: [
      {
        id: 'partial',
        type: 'lateral-cobb1',
        points,
        value: '',
        upperVertebra: 'T12',
        lowerVertebra: null,
      },
    ],
    vertebraeLayer: layerFor(['T12-1', 'T12-2', 'L5-3', 'L5-4']).slice(0, 2),
  });
  const moved = { x: 75, y: 50 };
  expect(moveCobb(editor, 0, moved)).toBe(true);
  expect(
    editor.result.current.workflow.keypoints.find(k => k.id === 'T12-1')?.point
  ).toEqual(moved);
  expect(editor.result.current.measurements[0].points).toEqual([
    moved,
    ...points.slice(1),
  ]);
  expect(editor.result.current.measurements[0].keypointSynced).not.toBe(true);
  expect(moveCobb(editor, 3, { x: 260, y: 330 })).toBe(false);
  editor.unmount();
});
