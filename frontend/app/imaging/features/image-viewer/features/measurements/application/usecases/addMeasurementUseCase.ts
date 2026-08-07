import {ImageSize, MeasurementData, Point, Tool} from "@/app/imaging/features/image-viewer/shared/types";
import type { PelvicMeasurementMetadata } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import {
    calculateMeasurementValue as calcMeasurementValue
} from "@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue";
import {getDescriptionForType as getDesc} from "@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-metadata";
import {getAnnotationTypeId} from "@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config";
import {
    hasUniqueAnnotationForTool,
    measurementMatchesTool,
} from "@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness";
import {getNextCobbType} from "@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb";
import {getS1BindingPointMap} from "@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding";
import {Dispatch, SetStateAction} from "react";

/**
 * 当某个 S1 相关测量被替换时，将新测量的 S1 端点坐标同步到其他所有 S1 相关测量中。
 * 这样即使用户重新标注了骶骨线，其他测量（PI/PT/SVA等）的 S1 点也会立即跟随，
 * 不需要等到下次拖动才通过绑定传播。
 */
function syncS1PointsAfterReplace(
    measurements: MeasurementData[],
    newMeasurement: MeasurementData,
    context: { standardDistance: number | null; standardDistancePoints: Point[]; imageNaturalSize: ImageSize }
): MeasurementData[] {
    const sourceMap = getS1BindingPointMap(newMeasurement);
    if (!sourceMap) return measurements;

    return measurements.map(m => {
        if (m.id === newMeasurement.id) return m;
        const mTypeId = getAnnotationTypeId(m.type);
        const targetMap = getS1BindingPointMap(m);
        if (!targetMap) return m;

        const newPoints = [...m.points];
        let changed = false;

        // 同步 S1 左端点
        if (sourceMap.left !== null && targetMap.left !== null &&
            sourceMap.left < newMeasurement.points.length &&
            targetMap.left < newPoints.length) {
            newPoints[targetMap.left] = {...newMeasurement.points[sourceMap.left]};
            changed = true;
        }

        // 同步 S1 右端点
        if (sourceMap.right !== null && targetMap.right !== null &&
            sourceMap.right < newMeasurement.points.length &&
            targetMap.right < newPoints.length) {
            newPoints[targetMap.right] = {...newMeasurement.points[sourceMap.right]};
            changed = true;
        }

        if (!changed) return m;
        return {
            ...m,
            points: newPoints,
            value: calcMeasurementValue(mTypeId, newPoints, context) || m.value,
        };
    });
}

export function addMeasurement(
    type: string,
    points: Point[] = [],
    measurements: MeasurementData[],
    setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>,
    tools: Tool[],
    standardDistance: number | null,
    standardDistancePoints: Point[],
    imageNaturalSize: ImageSize,
    options: {
        /** 替换模式：当同类型测量已存在时，用新测量替换旧测量（而非拦截）。 */
        allowReplace?: boolean;
        /** 标记该测量项由统一关键点绑定规则维护。 */
        keypointSynced?: boolean;
        /** PI/PT v2 的单/双股骨头模式；旧数据没有该字段时按单 FH 兼容。 */
        pelvicMetadata?: PelvicMeasurementMetadata;
    } = {}
){
    const {allowReplace = false, keypointSynced = false, pelvicMetadata} = options;
    // 如果是Cobb工具，自动编号（统一处理 'cobb' 和 'Cobb'）
    const requestedToolId = getAnnotationTypeId(type);
    let finalType = requestedToolId;
    const isCobb =
        requestedToolId === 'cobb' || requestedToolId === 'lateral-cobb';
    if (isCobb) {
        finalType = getNextCobbType(
            measurements,
            requestedToolId === 'lateral-cobb' ? 'lateral-cobb' : 'cobb'
        );
    }

    const configLookupType = isCobb ? requestedToolId : finalType;

    // 使用统一的配置系统计算测量值
    const defaultValue =
        calcMeasurementValue(configLookupType, points, {
            standardDistance,
            standardDistancePoints,
            imageNaturalSize,
        }) || '0.0°';
    const description = getDesc(configLookupType);

    const newMeasurement: MeasurementData = {
        id: Date.now().toString(),
        type: finalType, // 使用编号后的类型（Cobb1, Cobb2, Cobb3...）
        value: defaultValue,
        points: points,
        description,
        ...(keypointSynced ? {keypointSynced: true} : {}),
        ...(pelvicMetadata ? {pelvicMetadata} : {}),
    };

    setMeasurements(prev => {
        const currentTool = tools.find(t => t.id === configLookupType);
        if (currentTool && hasUniqueAnnotationForTool(prev, currentTool)) {
            if (!allowReplace) {
                // 保持现有测量不变，由调用方决定是否允许替换。
                return prev;
            }
            // 替换模式：过滤掉旧的同类型测量，加入新测量
            const withoutOld = prev.filter(
                m => !measurementMatchesTool(m, currentTool)
            );
            const afterReplace = [...withoutOld, newMeasurement];
            // 立即将新测量的 S1 端点坐标同步到其他 S1 相关测量（PI/PT/SVA/TPA等），
            // 避免重新标注骶骨线后相关测量的 S1 点坐标残留旧位置。
            return syncS1PointsAfterReplace(afterReplace, newMeasurement, {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
            });
        }

        // 将本次新增标注加入列表，并同步共享 S1 点到现有 S1 相关测量。
        // 删除 SS 后重新绘制 SS 时，PI/PT 保留 CFH，同时 S1 端点应跟随新的 SS。
        return syncS1PointsAfterReplace(
            [...prev, newMeasurement],
            newMeasurement,
            {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
            }
        );

    });
}
