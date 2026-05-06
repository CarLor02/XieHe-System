# 图像导出渲染改进

## 概述

本次改进重构了图像导出功能，使其使用与交互式查看器相同的 React SVG 渲染逻辑，而不是在 Canvas 2D 中手动重复绘制逻辑。

## 问题

之前的实现存在以下问题：

1. **代码重复**: 在 `create-annotated-image-export.ts` 中使用 Canvas 2D API 手动重新实现了所有测量标注的绘制逻辑
2. **维护成本高**: 每次修改查看器中的渲染逻辑时，都需要同步更新导出代码
3. **不一致性风险**: 手动重复代码容易导致查看器显示和导出图像之间出现视觉差异
4. **功能不完整**: Canvas 2D 实现可能遗漏某些 SVG 渲染器的特殊效果

## 解决方案

### 架构变更

新的实现流程：

```
DICOM 图像 (Blob)
    ↓
加载为 HTMLImageElement
    ↓
绘制到 Canvas
    ↓
使用 React SVG 渲染器 ← 重用查看器代码！
    ↓
渲染为 SVG 字符串 (renderToStaticMarkup)
    ↓
转换为 Image Blob
    ↓
叠加到 Canvas
    ↓
导出为 PNG/JPEG
```

### 关键技术点

1. **使用 `renderMeasurement` 函数**: 直接重用 `frontend/app/imaging/viewer/image-viewer/components/annotation-canvas/renderers/renderMeasurement.tsx` 中的渲染逻辑

2. **服务端渲染 (SSR)**: 使用 `react-dom/server` 的 `renderToStaticMarkup` 将 React 组件渲染为静态 SVG 字符串

3. **SVG 到图像转换**: 使用 Blob URL 和 `Image` 对象将 SVG 转换为可以绘制到 Canvas 的图像

4. **包含必要的 SVG 定义**: 添加箭头标记等 `<defs>` 元素，确保特殊形状正确显示

### 代码变更

#### 主要文件: `frontend/app/data-export/usecases/create-annotated-image-export.ts`

**删除的内容** (~230 行):
- 所有手动 Canvas 2D 绘制函数 (`drawSVAShape`, `drawSSShape`, 等)
- 几何计算辅助函数 (`pelvicGeometry`, `fillDot`, 等)
- 测量类型分发逻辑 (`drawMeasurementShape`)
- 标签绘制函数 (`drawMeasurementLabel`)

**新增的内容** (~90 行):
- `renderMeasurementsToSVG`: 使用 React 渲染器生成 SVG
- `loadSVGAsImage`: 将 SVG 字符串转换为图像
- 改进的错误处理和调试日志

## 优势

1. **单一数据源**: 所有渲染逻辑集中在一个地方（`renderMeasurement.tsx`）
2. **自动一致性**: 导出图像自动与查看器保持视觉一致
3. **减少代码**: 删除约 230 行重复代码
4. **易于维护**: 修改渲染逻辑时只需更新一处
5. **完整功能**: 自动支持所有 SVG 渲染器的功能和效果

## 技术细节

### SVG 标记定义

导出的 SVG 包含与查看器相同的标记定义：

```typescript
<defs>
  <marker id="arrowhead-normal" ...>
  <marker id="arrowhead-hovered" ...>
  <marker id="arrowhead-selected" ...>
</defs>
```

### 坐标缩放

如果标注是在不同分辨率下创建的，代码会自动缩放坐标：

```typescript
const scaleX = canvas.width / sourceWidth;
const scaleY = canvas.height / sourceHeight;

const scaledMeasurements = measurements.map(m => ({
  ...m,
  points: m.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }))
}));
```

### 渲染状态

导出时使用中性状态（无选择、无悬停）：

```typescript
const selectionState = {
  measurementId: null,
  pointIndex: null,
  type: null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
};
const hoverState = {
  measurementId: null,
  keypointId: null,
  pointIndex: null,
  elementType: null,
};
```

### 字体大小计算

为确保导出图像中的文字清晰可读，系统会根据图像分辨率计算合适的 `imageScale`：

```typescript
// 假设标准查看器宽度约 1000px
const REFERENCE_SCREEN_WIDTH = 1000;
const effectiveImageScale = Math.max(0.5, Math.min(2.0, REFERENCE_SCREEN_WIDTH / width));
```

这确保了：
- 低分辨率图像（如 800px 宽）：使用较大的 scale (1.25)，字体相应增大
- 标准分辨率图像（如 1000px 宽）：使用 1.0 scale，字体正常大小
- 高分辨率图像（如 2000px 宽）：使用较小的 scale (0.5)，但由于图像更大，字体绝对大小仍然清晰

## 未来改进

- 考虑添加导出配置选项（如隐藏/显示特定测量项）
- 支持自定义颜色主题
- 添加水印功能
- 支持导出多页 PDF

## 测试建议

1. 导出包含各种测量类型的图像（SVA, SS, PI, PT, Cobb 角等）
2. 验证导出图像与查看器显示一致
3. 测试不同图像分辨率
4. 测试 PNG 和 JPEG 格式
5. 验证箭头标注正确显示
