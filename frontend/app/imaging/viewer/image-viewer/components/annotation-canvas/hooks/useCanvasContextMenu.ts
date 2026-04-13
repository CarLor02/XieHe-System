import { useEffect, useState } from 'react';
import {
  AnnotationBindings,
  cleanupBindings,
} from '../../../domain/annotation-binding';
import { MeasurementData } from '../../../types';
import { SelectionState } from '../types';

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
 * 右键菜单与文字编辑弹窗状态。
 * 负责辅助图形右键菜单、文字编辑和删除后的绑定清理。
 */
export function useCanvasContextMenu({
  imageNaturalSize,
  selectionState,
  measurements,
  selectedTool,
  onToolChange,
  setSelectionState,
  onMeasurementsUpdate,
  pointBindings,
  setPointBindings,
}: UseCanvasContextMenuOptions) {
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    measurementId: null as string | null,
  });
  const [editLabelDialog, setEditLabelDialog] = useState({
    visible: false,
    measurementId: null as string | null,
    currentLabel: '',
  });

  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, measurementId: null });
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!imageNaturalSize) {
      console.warn('⚠️ 图像尚未加载完成，请稍候再进行操作');
      return;
    }

    if (selectionState.measurementId && selectionState.type === 'whole') {
      const selectedMeasurement = measurements.find(
        measurement => measurement.id === selectionState.measurementId
      );

      const auxiliaryShapeTypes = [
        '圆形标注',
        '椭圆标注',
        '矩形标注',
        '箭头标注',
      ];

      if (
        selectedMeasurement &&
        auxiliaryShapeTypes.includes(selectedMeasurement.type)
      ) {
        setContextMenu({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          measurementId: selectedMeasurement.id,
        });
        return;
      }
    }

    const auxiliaryTools = ['circle', 'ellipse', 'rectangle', 'arrow'];
    if (auxiliaryTools.includes(selectedTool)) {
      const auxiliaryShapeTypes = [
        '圆形标注',
        '椭圆标注',
        '矩形标注',
        '箭头标注',
      ];
      const lastAuxiliaryShape = [...measurements]
        .reverse()
        .find(measurement => auxiliaryShapeTypes.includes(measurement.type));

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

  const handleEditLabel = () => {
    const measurement = measurements.find(
      item => item.id === contextMenu.measurementId
    );
    if (!measurement) return;

    setEditLabelDialog({
      visible: true,
      measurementId: measurement.id,
      currentLabel: measurement.description || '',
    });
    hideContextMenu();
  };

  const handleDeleteShape = () => {
    if (!contextMenu.measurementId) {
      hideContextMenu();
      return;
    }

    const remainingMeasurements = measurements.filter(
      measurement => measurement.id !== contextMenu.measurementId
    );
    onMeasurementsUpdate(remainingMeasurements);

    const remainingIds = new Set(remainingMeasurements.map(item => item.id));
    setPointBindings(cleanupBindings(pointBindings, remainingIds));
    setSelectionState({
      measurementId: null,
      pointIndex: null,
      type: null,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
    });
    hideContextMenu();
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

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  return {
    contextMenu,
    setContextMenu,
    editLabelDialog,
    setEditLabelDialog,
    handleContextMenu,
    handleEditLabel,
    handleDeleteShape,
    handleSaveLabel,
    handleCancelEdit,
  };
}
