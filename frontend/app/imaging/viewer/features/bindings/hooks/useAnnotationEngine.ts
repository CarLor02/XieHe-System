import { useEffect, useMemo, useState } from 'react';
import {
  AnnotationBindings,
  PointRef,
  PointSyncGroup,
  autoCreateS1Bindings,
  createEmptyBindings,
  getSyncGroupsForPoint,
  mergeBindings,
} from '@/app/imaging/viewer/features/bindings/domain/annotation-binding';
import { autoCreateInheritanceBindings } from '@/app/imaging/viewer/features/measurements/domain/annotation-inheritance';
import { MeasurementData, Point } from '@/app/imaging/viewer/shared/types';
import { getAnnotationTypeId } from '@/app/imaging/viewer/features/measurements/catalog/shared/annotation-config';

/**
 * 绑定、自动绑定、继承点与共享点位操作状态。
 */
interface UseAnnotationEngineOptions {
  measurements: MeasurementData[];
  setMeasurements: React.Dispatch<React.SetStateAction<MeasurementData[]>>;
}

export function useAnnotationEngine({
  measurements,
  setMeasurements,
}: UseAnnotationEngineOptions) {
  const [pointBindings, setPointBindings] = useState<AnnotationBindings>(
    createEmptyBindings()
  );
  const [selectedBindingGroupId, setSelectedBindingGroupId] = useState<
    string | null
  >(null);
  const [isBindingPanelOpen, setIsBindingPanelOpen] = useState(false);
  const [centerOnPoint, setCenterOnPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isManualBindingMode, setIsManualBindingMode] = useState(false);
  const [manualBindingSelectedPoints, setManualBindingSelectedPoints] =
    useState<PointRef[]>([]);

  const measurementStructureKey = useMemo(
    () => measurements.map(measurement => `${measurement.id}:${measurement.type}`).join('|'),
    [measurements]
  );

  /**
   * 当标注列表的结构（增删）变化时自动重建 S1 上缘点绑定。
   * 只要存在 ≥2 个 S1 相关标注（SS / LL L1-S1 / LL L4-S1 / PI / PT / TPA / SVA），即自动绑定，无需用户操作。
   * 绑定重建仅在 AI 返回数据、标注完成这两个时刻触发，手动拖动不会重置绑定状态。
   * SVA[4] 骶椎后缘参考点与 S1上缘右端点同位，纳入绑定族后可与 SS/PI/PT 联动。
   */
  useEffect(() => {
    const S1_RELATED_TYPES = new Set([
      'ss',
      'll-l1-s1',
      'll-l4-s1',
      'pi',
      'pt',
      'tpa',
      'sva',
    ]);
    const s1Count = measurements.filter(measurement =>
      S1_RELATED_TYPES.has(getAnnotationTypeId(measurement.type))
    ).length;
    const s1Bindings =
      s1Count >= 2 ? autoCreateS1Bindings(measurements) : createEmptyBindings();

    setPointBindings(previousBindings => {
      const keptGroups = previousBindings.syncGroups.filter(
        group =>
          !group.id.startsWith('S1-') &&
          !group.id.startsWith('inherit-') &&
          !group.id.startsWith('shared-')
      );
      const withS1 = mergeBindings({ syncGroups: keptGroups }, s1Bindings);
      return autoCreateInheritanceBindings(measurements, withS1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurementStructureKey]);

  const clearBindings = () => {
    setPointBindings(createEmptyBindings());
  };

  const removeBindingGroup = (groupId: string) => {
    setPointBindings(previousBindings => ({
      syncGroups: previousBindings.syncGroups.filter(group => group.id !== groupId),
    }));
    if (selectedBindingGroupId === groupId) {
      setSelectedBindingGroupId(null);
    }
  };

  const removeBindingMember = (
    groupId: string,
    annotationId: string,
    pointIndex: number
  ) => {
    setPointBindings(previousBindings => ({
      syncGroups: previousBindings.syncGroups
        .map(group => {
          if (group.id !== groupId) return group;
          return {
            ...group,
            members: group.members.filter(
              member =>
                !(
                  member.annotationId === annotationId &&
                  member.pointIndex === pointIndex
                )
            ),
          };
        })
        .filter(group => group.members.length >= 2),
    }));
  };

  const toggleManualBindingPoint = (
    annotationId: string,
    pointIndex: number
  ) => {
    setManualBindingSelectedPoints(previousPoints => {
      const exists = previousPoints.some(
        point =>
          point.annotationId === annotationId && point.pointIndex === pointIndex
      );
      if (exists) {
        return previousPoints.filter(
          point =>
            !(
              point.annotationId === annotationId &&
              point.pointIndex === pointIndex
            )
        );
      }
      return [...previousPoints, { annotationId, pointIndex }];
    });
  };

  const completeManualBinding = () => {
    if (manualBindingSelectedPoints.length >= 2) {
      const involvedGroupIds = new Set<string>();

      for (const point of manualBindingSelectedPoints) {
        getSyncGroupsForPoint(
          point.annotationId,
          point.pointIndex,
          pointBindings
        ).forEach(group => involvedGroupIds.add(group.id));
      }

      const mergedMembersMap = new Map<string, PointRef>();
      for (const group of pointBindings.syncGroups) {
        if (involvedGroupIds.has(group.id)) {
          group.members.forEach(member =>
            mergedMembersMap.set(
              `${member.annotationId}:${member.pointIndex}`,
              member
            )
          );
        }
      }
      manualBindingSelectedPoints.forEach(point =>
        mergedMembersMap.set(`${point.annotationId}:${point.pointIndex}`, point)
      );

      const allMembers = Array.from(mergedMembersMap.values());
      if (allMembers.length >= 2) {
        const newGroup: PointSyncGroup = {
          id: `manual-${Date.now()}`,
          name: `手动绑定组 ${
            pointBindings.syncGroups.filter(group => group.id.startsWith('manual-'))
              .length + 1
          }`,
          color: '#22d3ee',
          members: allMembers,
        };

        setPointBindings(previousBindings => ({
          syncGroups: [
            ...previousBindings.syncGroups.filter(
              group => !involvedGroupIds.has(group.id)
            ),
            newGroup,
          ],
        }));

        const anchor =
          manualBindingSelectedPoints[manualBindingSelectedPoints.length - 1];
        const anchorMeasurement = measurements.find(
          measurement => measurement.id === anchor.annotationId
        );
        const anchorPoint = anchorMeasurement?.points[anchor.pointIndex];

        if (anchorPoint) {
          setMeasurements(previousMeasurements =>
            previousMeasurements.map(measurement => {
              const affected = allMembers.filter(
                member =>
                  member.annotationId === measurement.id &&
                  !(
                    member.annotationId === anchor.annotationId &&
                    member.pointIndex === anchor.pointIndex
                  )
              );
              if (affected.length === 0) return measurement;

              const newPoints = [...measurement.points];
              for (const member of affected) {
                newPoints[member.pointIndex] = { ...anchorPoint } as Point;
              }
              return { ...measurement, points: newPoints };
            })
          );
        }
      }
    }

    setIsManualBindingMode(false);
    setManualBindingSelectedPoints([]);
  };

  const cancelManualBinding = () => {
    setIsManualBindingMode(false);
    setManualBindingSelectedPoints([]);
  };

  return {
    pointBindings,
    setPointBindings,
    selectedBindingGroupId,
    setSelectedBindingGroupId,
    isBindingPanelOpen,
    setIsBindingPanelOpen,
    centerOnPoint,
    setCenterOnPoint,
    isManualBindingMode,
    setIsManualBindingMode,
    manualBindingSelectedPoints,
    setManualBindingSelectedPoints,
    clearBindings,
    removeBindingGroup,
    removeBindingMember,
    toggleManualBindingPoint,
    completeManualBinding,
    cancelManualBinding,
  };
}
