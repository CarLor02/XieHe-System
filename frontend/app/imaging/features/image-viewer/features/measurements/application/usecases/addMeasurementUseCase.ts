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
import {Dispatch, SetStateAction} from "react";

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
            return [...withoutOld, newMeasurement];
        }

        // 共享解剖点由 useMeasurementWorkflow 写回关键点层后统一重算，
        // addMeasurement 只负责新增/替换测量项，避免再维护一套按 points[]
        // 下标传播的 S1 特例。
        return [...prev, newMeasurement];

    });
}
