import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import { isKeypointSupportedExamType } from '@xiehe/imaging-core/anatomy';
import {
  rectifyVertebraCornerOrder,
  shiftVertebraLabels,
  type VertebraCornerOrderMapping,
  type VertebraLabelOffsetOptions,
} from '@xiehe/imaging-core/keypoints';
import { shiftMeasurementVertebraLabels } from '@xiehe/imaging-core/measurement-keypoint-sync';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { confirmKeypoints } from './editorSnapshot';
import { getRectificationGroups } from './editorToolQueries';

export function correctVertebraCorners(
  snapshot: AnnotationEditorSnapshot,
  context: CalculationContext,
  vertebra: string,
  mapping: VertebraCornerOrderMapping[]
): AnnotationEditorSnapshot {
  const group = getRectificationGroups(snapshot, context.examType ?? '').find(
    item => item.name === vertebra
  );
  if (!group?.complete) throw new Error(`${vertebra}的四个关键点尚不完整`);
  if (mapping.length !== 4) throw new Error('请为四个角点各指定一个序号');
  const result = rectifyVertebraCornerOrder(
    snapshot.keypoints,
    vertebra,
    mapping
  );
  if (!result.ok)
    throw new Error(
      `椎体缺少序号${result.missingSequenceNumbers.join(',')}，请检查输入的序号`
    );
  return confirmKeypoints(snapshot, result.keypoints, context);
}

export function offsetVertebraLabels(
  snapshot: AnnotationEditorSnapshot,
  context: CalculationContext,
  options: Omit<VertebraLabelOffsetOptions, 'examType'>
): AnnotationEditorSnapshot {
  const examType = context.examType ?? '';
  if (!isKeypointSupportedExamType(examType))
    throw new Error('此检查类型不支持椎体序号纠正');
  const result = shiftVertebraLabels(snapshot.keypoints, {
    ...options,
    examType,
  });
  if (!result.ok) {
    if (result.reason === 'invalid-offset') throw new Error('请输入有效偏移量');
    if (result.reason === 'invalid-range')
      throw new Error('请选择有效的起止椎体，起始椎体不能比结束椎体更靠下');
    if (result.reason === 'out-of-range')
      throw new Error(
        `偏移后椎体超出可用范围：${result.targetVertebraLabels?.join(',') ?? ''}`
      );
    throw new Error(
      `偏移后关键点不存在：${result.targetKeypointIds?.join(',') ?? ''}`
    );
  }
  if (
    !snapshot.keypoints.some(point =>
      result.vertebraLabelMap.has(point.id.split('-')[0])
    )
  )
    throw new Error('所选范围没有可偏移的椎体关键点');
  // 标签偏移必须同时迁移测量端椎及 AVT 归属，再按新点位重算；整份快照一次进入历史。
  return confirmKeypoints(
    {
      ...snapshot,
      measurements: shiftMeasurementVertebraLabels(
        snapshot.measurements,
        result.vertebraLabelMap
      ),
    },
    result.keypoints,
    context
  );
}
