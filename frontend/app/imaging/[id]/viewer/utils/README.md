# 工具函数库使用说明

本目录包含了 ImageViewer 组件使用的所有工具函数和常量定义。

## 📁 文件结构

```
utils/
├── index.ts                    # 统一导出入口
├── README.md                   # 本文件
../
├── constants.ts                # 常量定义
├── types.ts                    # TypeScript 类型定义
├── geometryUtils.ts            # 几何计算工具
├── coordinateTransform.ts      # 坐标转换工具
├── textLabelUtils.ts           # 文字标注工具
├── selectionUtils.ts           # 选择检测工具
└── toolUtils.ts                # 工具类型判断
```

## 📦 模块说明

### 1. constants.ts - 常量定义

包含所有硬编码的常量值，避免魔法数字。

```typescript
import { INTERACTION_CONSTANTS, TEXT_LABEL_CONSTANTS } from './constants';

// 使用点击检测半径
const radius = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS; // 10

// 使用文字字体大小
const fontSize = TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE; // 14
```

**主要常量组：**
- `INTERACTION_CONSTANTS` - 交互相关常量（点击半径、选中框等）
- `TEXT_LABEL_CONSTANTS` - 文字标注常量（字体大小、内边距等）
- `IMAGE_ADJUSTMENT_CONSTANTS` - 图像调整常量（亮度、对比度、缩放范围）
- `STANDARD_DISTANCE_CONSTANTS` - 标准距离常量
- `AUXILIARY_TOOL_TYPES` - 辅助工具类型列表
- `COLORS` - 颜色常量

### 2. types.ts - 类型定义

统一管理所有 TypeScript 类型和接口。

```typescript
import { Point, Measurement, TransformContext } from './types';

const point: Point = { x: 100, y: 200 };
const measurement: Measurement = {
  id: '1',
  type: 'Cobb',
  value: '25.5°',
  points: [point],
};
```

### 3. geometryUtils.ts - 几何计算

提供点、线、图形等几何计算功能。

```typescript
import {
  calculateDistance,
  pointToLineDistance,
  isPointInBounds,
  getBoundingBox,
  getCenterPoint,
} from './geometryUtils';

// 计算两点距离
const dist = calculateDistance(p1, p2);

// 计算点到线段的距离
const lineDistance = pointToLineDistance(point, lineStart, lineEnd);

// 检查点是否在边界框内
const inBounds = isPointInBounds(point, points, padding);

// 获取点集的边界框
const bbox = getBoundingBox(points);

// 获取点集的中心点
const center = getCenterPoint(points);
```

### 4. coordinateTransform.ts - 坐标转换

处理图像坐标系和屏幕坐标系之间的转换。

```typescript
import { imageToScreen, screenToImage } from './coordinateTransform';

const context: TransformContext = {
  imageNaturalSize: { width: 1000, height: 1000 },
  imagePosition: { x: 0, y: 0 },
  imageScale: 1.5,
};

// 图像坐标 -> 屏幕坐标
const screenPoint = imageToScreen({ x: 100, y: 200 }, context);

// 屏幕坐标 -> 图像坐标
const imagePoint = screenToImage(150, 300, context);
```

### 5. textLabelUtils.ts - 文字标注

处理文字标注的位置计算、尺寸估算等。

```typescript
import {
  estimateTextWidth,
  estimateTextHeight,
  isPointInTextLabel,
  formatMeasurementText,
} from './textLabelUtils';

// 估算文字宽度
const width = estimateTextWidth('Cobb: 25.5°', 14, 4);

// 估算文字高度
const height = estimateTextHeight(14, 4);

// 检查点是否在文字标识区域
const inLabel = isPointInTextLabel(point, measurement, imageScale);

// 格式化测量值文本
const text = formatMeasurementText(measurement); // "Cobb: 25.5°"
```

### 6. selectionUtils.ts - 选择检测

处理点击检测、悬浮检测等选择相关逻辑。

```typescript
import {
  isPointClicked,
  isLineClicked,
  isCircleClicked,
  isEllipseClicked,
  isRectangleClicked,
  isPolygonClicked,
} from './selectionUtils';

// 检查是否点击了点
const pointClicked = isPointClicked(clickPoint, targetPoint, context);

// 检查是否点击了线段
const lineClicked = isLineClicked(clickPoint, lineStart, lineEnd, context);

// 检查是否点击了圆形
const circleClicked = isCircleClicked(clickPoint, center, edge, context);

// 检查是否点击了多边形
const polygonClicked = isPolygonClicked(clickPoint, points, context);
```

### 7. toolUtils.ts - 工具判断

处理工具类型判断、工具切换等逻辑。

```typescript
import {
  isAuxiliaryTool,
  isAuxiliaryShape,
  needsHorizontalLine,
  needsVerticalLine,
  dependsOnStandardDistance,
  requiresStandardDistance,
  getToolDisplayName,
} from './toolUtils';

// 检查是否为辅助工具
const isAux = isAuxiliaryTool('circle'); // true

// 检查是否为辅助图形
const isShape = isAuxiliaryShape('圆形标注'); // true

// 检查是否需要水平参考线
const needsH = needsHorizontalLine('t1-tilt'); // true

// 检查是否依赖标准距离
const needsSD = dependsOnStandardDistance('AVT'); // true

// 获取工具显示名称
const name = getToolDisplayName('cobb'); // "Cobb角"
```

## 🚀 使用示例

### 完整示例：在 ImageViewer 中使用

```typescript
import {
  INTERACTION_CONSTANTS,
  Point,
  TransformContext,
  imageToScreen,
  screenToImage,
  isPointClicked,
  calculateDistance,
} from './utils';

function ImageCanvas() {
  const context: TransformContext = {
    imageNaturalSize: { width: 1000, height: 1000 },
    imagePosition: { x: 0, y: 0 },
    imageScale: 1.0,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPoint: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // 转换为图像坐标
    const imagePoint = screenToImage(clickPoint.x, clickPoint.y, context);

    // 检查是否点击了某个点
    measurements.forEach(measurement => {
      measurement.points.forEach((point, index) => {
        if (isPointClicked(clickPoint, point, context)) {
          console.log(`点击了第 ${index} 个点`);
        }
      });
    });
  };

  return <div onMouseDown={handleMouseDown}>...</div>;
}
```

## 📝 注意事项

1. **坐标系统**
   - 图像坐标：基于图像原始尺寸的坐标（左上角为原点）
   - 屏幕坐标：基于容器的显示坐标（相对于容器左上角）
   - 使用 `imageToScreen` 和 `screenToImage` 进行转换

2. **常量使用**
   - 优先使用 `constants.ts` 中定义的常量
   - 避免在代码中直接使用魔法数字

3. **类型安全**
   - 所有函数都有完整的 TypeScript 类型定义
   - 使用 `types.ts` 中的类型定义确保类型安全

4. **性能优化**
   - 几何计算函数已优化，可以频繁调用
   - 坐标转换会查询 DOM，建议缓存结果

## 🔧 维护指南

### 添加新常量

在 `constants.ts` 中添加：

```typescript
export const NEW_CONSTANTS = {
  SOME_VALUE: 100,
} as const;
```

### 添加新工具函数

1. 在对应的工具文件中添加函数
2. 在 `utils/index.ts` 中导出
3. 更新本 README 文件

### 添加新类型

在 `types.ts` 中添加：

```typescript
export interface NewType {
  // ...
}
```

## 📚 相关文档

- [annotationConfig.ts](../annotationConfig.ts) - 标注配置
- [annotationHelpers.ts](../annotationHelpers.ts) - 标注辅助函数
- [ImageViewer.tsx](../ImageViewer.tsx) - 主组件

