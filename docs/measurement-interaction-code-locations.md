# 测量标注交互代码位置索引

本文档记录了 `ImageViewer.tsx` 中处理测量标注选中、高亮、拖拽等交互功能的关键代码位置，便于快速定位和修改。

## 文件路径
`/Users/bytedance/XieHe-System/frontend/app/imaging/[id]/viewer/ImageViewer.tsx`

---

## 一、标识渲染位置（显示在哪里）

### 位置：约第 4840-4880 行
**功能：** 计算并渲染测量值文字标识的位置

**关键代码段：**
```typescript
// 计算标注位置
let textX, textY;

if (measurement.type === 'T1 Tilt') {
  textX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
  textY = minY - 30;
} else if (measurement.type === 'T1 Slope') {
  textX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
  textY = minY - 30;
} else if (measurement.type === 'RSH') {
  // ... 其他类型
}

// 渲染白色背景框和文字
<rect ... />
<text ... />
```

**注意事项：**
- 使用屏幕坐标系（screenPoints）
- Y轴向下为正，所以向上偏移用减法（minY - 30）
- 新增测量类型时需要在此添加特殊定位逻辑

---

## 二、点击选中检测

### 位置1：约第 2760-2820 行
**功能：** 使用图像坐标系检测点击是否在标识区域（`isPointInTextLabel` 函数）

**关键代码段：**
```typescript
const isPointInTextLabel = (point: Point, measurement: any): boolean => {
  if (measurement.points.length < 2) return false;
  
  let textX, textY;
  
  if (measurement.type === 'T1 Tilt') {
    textX = (measurement.points[0].x + measurement.points[1].x) / 2;
    const minY = Math.min(measurement.points[0].y, measurement.points[1].y);
    textY = minY - 30 / imageScale;
  } else if (measurement.type === 'T1 Slope') {
    textX = (measurement.points[0].x + measurement.points[1].x) / 2;
    const minY = Math.min(measurement.points[0].y, measurement.points[1].y);
    textY = minY - 30 / imageScale;
  }
  // ... 检测逻辑
};
```

**注意事项：**
- 使用图像坐标系（measurement.points）
- 需要除以 imageScale 进行缩放补偿
- **此函数已定义但未被调用，实际使用的是位置2**

### 位置2：约第 2980-3020 行 ⭐ **实际生效的检测逻辑**
**功能：** 使用屏幕坐标系检测点击，在鼠标按下事件中调用

**关键代码段：**
```typescript
// 非辅助图形:检查文字标识区域（使用屏幕坐标）
const screenPoints = measurement.points.map(p => imageToScreen(p));
let textBaselineX, textBaselineY;

if (measurement.type === 'T1 Tilt') {
  textBaselineX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
  textBaselineY = minY - 30;
} else if (measurement.type === 'T1 Slope') {
  textBaselineX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
  textBaselineY = minY - 30;
}

const textContent = `${measurement.type}: ${measurement.value}`;
const textWidth = textContent.length * 8;
const textTop = textBaselineY - 14;
const textBottom = textBaselineY + 4;

if (screenPoint.x >= textBaselineX - textWidth / 2 && ...) {
  selectedMeasurement = measurement;
  selType = 'whole';
  foundSelection = true;
}
```

**注意事项：**
- 使用屏幕坐标系（screenPoints）
- 这是实际执行的点击检测逻辑
- 在 `onMouseDown` 事件处理函数中
- 检测通过后会设置 `selectedMeasurementId` 和 `selectionType`

---

## 三、悬浮高亮检测

### 位置：约第 3760-3810 行
**功能：** 检测鼠标是否悬浮在标识区域上，触发高亮效果

**关键代码段：**
```typescript
// 非辅助图形：检查文字标识区域（使用屏幕坐标，与渲染位置保持一致）
const screenPoints = measurement.points.map(p => imageToScreen(p));

if (measurement.type === 'T1 Tilt') {
  if (screenPoints.length < 2) continue;
  textBaselineX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
  textBaselineY = minY - 30;
} else if (measurement.type === 'T1 Slope') {
  if (screenPoints.length < 2) continue;
  textBaselineX = (screenPoints[0].x + screenPoints[1].x) / 2;
  const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
  textBaselineY = minY - 30;
}

// 检测悬浮
const textContent = `${measurement.type}: ${measurement.value}`;
const textWidth = textContent.length * 8;
const textTop = textBaselineY - 14;
const textBottom = textBaselineY + 4;

if (screenPoint.x >= textBaselineX - textWidth / 2 && ...) {
  hoveredMeasurementId = measurement.id;
  hoveredElementType = 'whole';
  foundHover = true;
}
```

**注意事项：**
- 使用屏幕坐标系（screenPoints）
- 在鼠标移动事件处理函数中
- 检测通过后会设置 `hoveredMeasurementId` 和 `hoveredElementType`
- 高亮状态会改变标识的字体大小和颜色

---

## 四、拖拽功能

### 位置1：约第 3080-3180 行
**功能：** 鼠标按下时检查是否点击在已选中对象的边界框内，启动拖拽

**关键代码段：**
```typescript
if (selectedMeasurementId) {
  const measurement = measurements.find(m => m.id === selectedMeasurementId);
  if (measurement) {
    if (selectionType === 'point') {
      // 点选择模式：检查是否在选中点的可拖拽区域内
      // ...
    } else if (selectionType === 'whole') {
      // 整体选择模式：检查是否在测量结果的边界框内
      const screenPoints = measurement.points.map(p => imageToScreen(p));
      // 计算边界框
      // ...
      if (mouseScreenPoint.x >= selectionBoxMinX && ...) {
        setDragOffset({ x: ..., y: ... });
        foundSelection = true;
      }
    }
  }
}
```

### 位置2：约第 3300-3400 行
**功能：** 确定是否可以拖拽（检查鼠标是否在边界框内）

**关键代码段：**
```typescript
if (selectedMeasurementId) {
  const measurement = measurements.find(m => m.id === selectedMeasurementId);
  if (measurement && measurement.points.length > 0) {
    // 计算边界框范围
    if (selectionType === 'whole') {
      // 辅助图形特殊处理
      if (measurement.type === '圆形标注') { ... }
      else if (measurement.type === '椭圆标注') { ... }
      else {
        // 默认：基于标注点位置
        const screenPoints = measurement.points.map(p => imageToScreen(p));
        minX = Math.min(...xs) - 15;
        maxX = Math.max(...xs) + 15;
        // ...
      }
    }
    
    // 检查鼠标是否在边界框内
    if (mouseScreenPoint.x >= minX && ...) {
      canDrag = true;
    }
  }
}

if (canDrag) {
  setIsDraggingSelection(true);
}
```

### 位置3：约第 3480-3560 行
**功能：** 执行拖拽操作，更新点或整体位置

**关键代码段：**
```typescript
if (isDraggingSelection || selectedMeasurementId || selectedPointIndex !== null) {
  if (selectedMeasurementId) {
    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    
    if (selectionType === 'point' && selectedPointIndex !== null) {
      // 移动单个点
      const newPointX = imagePoint.x - dragOffset.x;
      const newPointY = imagePoint.y - dragOffset.y;
      
      const updatedMeasurements = measurements.map(m => {
        if (m.id === selectedMeasurementId) {
          const updatedMeasurement = {
            ...m,
            points: m.points.map((p, idx) => 
              idx === selectedPointIndex ? { x: newPointX, y: newPointY } : p
            ),
          };
          updatedMeasurement.value = recalculateMeasurementValue(updatedMeasurement);
          return updatedMeasurement;
        }
        return m;
      });
      onMeasurementsUpdate(updatedMeasurements);
      
    } else if (selectionType === 'whole') {
      // 移动整个测量结果
      // ...
    }
  }
}
```

**注意事项：**
- 拖拽使用图像坐标系进行计算（dragOffset）
- 需要在拖拽后重新计算测量值（`recalculateMeasurementValue`）
- 拖拽状态通过 `isDraggingSelection` 管理

---

## 五、状态管理变量

### 选中状态
```typescript
const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
const [selectionType, setSelectionType] = useState<'point' | 'whole' | null>(null);
```

### 拖拽状态
```typescript
const [isDraggingSelection, setIsDraggingSelection] = useState(false);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
```

### 悬浮状态
```typescript
const [hoveredMeasurementId, setHoveredMeasurementId] = useState<string | null>(null);
const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
const [hoveredElementType, setHoveredElementType] = useState<'point' | 'whole' | null>(null);
```

---

## 六、添加新测量类型的检查清单

当添加新的测量类型（如T1 Slope）时，需要在以下位置添加相应代码：

- [ ] **标识渲染位置计算**（第4840-4880行）
- [ ] **点击选中检测**（第2980-3020行）⭐ 关键
- [ ] **悬浮高亮检测**（第3760-3810行）⭐ 关键
- [ ] **特殊渲染逻辑**（如角度弧线、参考线等，约4370-4500行）
- [ ] **测量值计算函数**（`recalculateMeasurementValue`）
- [ ] **工具配置**（`getToolsForExamType`）

---

## 七、坐标系说明

### 图像坐标系
- 原点：图像左上角
- X轴：向右为正
- Y轴：向下为正
- 单位：图像像素
- 存储：`measurement.points`

### 屏幕坐标系
- 原点：容器左上角
- X轴：向右为正
- Y轴：向下为正
- 单位：屏幕像素
- 转换：通过 `imageToScreen()` 和 `screenToImage()` 函数

### 重要提示
- **渲染、点击检测、悬浮检测** 都使用屏幕坐标系
- **数据存储、拖拽计算** 使用图像坐标系
- 标识向上偏移用减法（因为Y轴向下为正）：`minY - 30`

---

## 八、常见问题

### Q1: 添加了新测量类型但标识位置不对？
**A:** 检查是否在三个位置都添加了位置计算逻辑：
1. 标识渲染（约4850行）
2. 点击检测（约2990行）
3. 悬浮检测（约3770行）

### Q2: 标识可以显示但无法点击选中？
**A:** 检查点击检测逻辑（约2990行），确保使用的是屏幕坐标系且计算方式与渲染一致。

### Q3: 鼠标悬浮无高亮效果？
**A:** 检查悬浮检测逻辑（约3770行），确保添加了该测量类型的特殊定位。

### Q4: 拖拽后测量值不更新？
**A:** 检查是否在拖拽后调用了 `recalculateMeasurementValue` 函数重新计算测量值。

---

**最后更新：** 2026年1月12日
**维护者：** 开发团队
