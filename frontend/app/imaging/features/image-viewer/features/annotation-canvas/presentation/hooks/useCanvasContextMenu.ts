import { useState } from 'react';
import { AnnotationBindings } from '@xiehe/imaging-core/bindings';
import {
  getEditableAuxiliaryAnnotationLabel,
  isEditableAuxiliaryAnnotationType,
} from '@xiehe/imaging-catalog/annotations';
import { MeasurementData } from '@xiehe/imaging-core/contracts';
import { isAuxiliaryTool } from '@xiehe/imaging-core/canvas';
import { SelectionState } from '@xiehe/imaging-core/canvas';
import { createLogger } from '@/lib/logger';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.annotation.canvas.presentation.hooks.useCanvasContextMenu'
);

interface UseCanvasContextMenuOptions {
  imageNaturalSize: { width: number; height: number } | null;
  selectionState: SelectionState;
  measurements: MeasurementData[];
  selectedTool: string;
  onToolChange: (tool: string) => void;
  setSelectionState: React.Dispatch<React.SetStateAction<SelectionState>>;
  onMeasurementsUpdate: (measurements: MeasurementData[]) => void;
  pointBindings: AnnotationBindings;
  setPointBindings: (bindings: AnnotationBindings) => void;
}

/**
 * 文字编辑弹窗状态。右键辅助图形直接进入编辑文字弹窗（一步操作），
 * 删除走面板上的删除按钮，避免重复入口。
 */
export function useCanvasContextMenu({
  imageNaturalSize,
  selectionState,
  measurements,
  selectedTool,
  onToolChange,
  setSelectionState,
  onMeasurementsUpdate,
}: UseCanvasContextMenuOptions) {
  const [editLabelDialog, setEditLabelDialog] = useState({
    visible: false,
    measurementId: null as string | null,
    currentLabel: '',
  });

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!imageNaturalSize) {
      logger.warn('⚠️ 图像尚未加载完成，请稍候再进行操作');
      return;
    }

    if (selectionState.measurementId) {
      const selectedMeasurement = measurements.find(
        measurement => measurement.id === selectionState.measurementId
      );

      if (
        selectedMeasurement &&
        isEditableAuxiliaryAnnotationType(selectedMeasurement.type)
      ) {
        setEditLabelDialog({
          visible: true,
          measurementId: selectedMeasurement.id,
          currentLabel:
            getEditableAuxiliaryAnnotationLabel(selectedMeasurement),
        });
        return;
      }
    }

    if (isAuxiliaryTool(selectedTool)) {
      const lastAuxiliaryShape = [...measurements]
        .reverse()
        .find(measurement =>
          isEditableAuxiliaryAnnotationType(measurement.type)
        );

      if (lastAuxiliaryShape) {
        setSelectionState({
          measurementId: lastAuxiliaryShape.id,
          pointIndex: null,
          type: 'whole',
          isDragging: false,
          dragOffset: { x: 0, y: 0 },
        });
      }

      onToolChange('hand');
    }
  };

  const handleSaveLabel = () => {
    if (editLabelDialog.measurementId) {
      onMeasurementsUpdate(
        measurements.map(measurement =>
          measurement.id === editLabelDialog.measurementId
            ? { ...measurement, description: editLabelDialog.currentLabel }
            : measurement
        )
      );
    }

    setEditLabelDialog({
      visible: false,
      measurementId: null,
      currentLabel: '',
    });
  };

  const handleCancelEdit = () => {
    setEditLabelDialog({
      visible: false,
      measurementId: null,
      currentLabel: '',
    });
  };

  return {
    editLabelDialog,
    setEditLabelDialog,
    handleContextMenu,
    handleSaveLabel,
    handleCancelEdit,
  };
}
