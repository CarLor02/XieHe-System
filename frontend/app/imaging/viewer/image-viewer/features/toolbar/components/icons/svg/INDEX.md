# 医学测量图标SVG文件

本目录包含所有医学测量的独立SVG文件，基于用户设计图精确重绘。

## 文件列表

### 脊柱和骨盆测量图标

| 文件名 | 名称 | 医学含义 | 描述 |
|--------|------|----------|------|
| `icon-po.svg` | PO | Pelvic Obliquity | 骨盆倾斜角 - 正面骨盆，显示髂骨翼和髋臼 |
| `icon-css.svg` | CSS | Coronal Sacral Slope | 冠状面骶骨倾斜角 - 正面骶骨形状 |
| `icon-ss.svg` | SS | Sacral Slope | 骶骨倾斜角 - 侧面骶骨 |
| `icon-cobb.svg` | Cobb角 | Cobb Angle | 脊柱侧弯角度 - 倾斜椎体和测量线 |
| `icon-ts.svg` | TS | Trunk Shift (4-point) | 躯干偏移量(4点法) - 椎体序列偏移 |
| `icon-tts.svg` | TTS | C7 Offset (6-point) | C7偏移距离(6点法) - 侧面脊柱和C7 |
| `icon-tpa.svg` | TPA | Trunk Pelvic Angle | 躯干骨盆角 - 侧面躯干和骨盆 |
| `icon-sva.svg` | SVA | Sagittal Vertical Axis | 矢状面垂直轴 - C7和骶骨垂直关系 |
| `icon-pi.svg` | PI | Pelvic Incidence | 骨盆入射角 - 骶骨和股骨头 |
| `icon-pt.svg` | PT | Pelvic Tilt | 骨盆倾角 - 骨盆侧面倾斜 |

### 辅助工具图标

| 文件名 | 名称 | 描述 |
|--------|------|------|
| `icon-aux-length.svg` | 辅助距离 | 水平双箭头距离测量 |
| `icon-aux-angle-3.svg` | 辅助角度(3点) | 三点角度测量，显示角度弧 |
| `icon-aux-angle-4.svg` | 辅助角度(4点) | 四点双线夹角测量 |

## 技术规范

所有SVG图标遵循统一规范：

- **ViewBox**: `0 0 64 64`
- **描边宽度**: `1.2` (医学测量图标) / `1.5` (辅助工具图标)
- **描边端点**: `round` (stroke-linecap)
- **描边连接**: `round` (stroke-linejoin)
- **颜色**: `currentColor` (继承父元素颜色)
- **填充**: `none` (纯线条风格)

## 使用方法

### 1. 直接在HTML中使用

```html
<img src="./svg/icon-po.svg" width="48" height="48" alt="PO" />
```

### 2. 作为背景图

```css
.icon-po {
  width: 48px;
  height: 48px;
  background: url('./svg/icon-po.svg') no-repeat center;
  background-size: contain;
}
```

### 3. 内联SVG

```html
<svg viewBox="0 0 64 64" width="48" height="48">
  <!-- 复制SVG文件内容 -->
</svg>
```

### 4. 在React中使用

```typescript
import { ReactComponent as IconPO } from './svg/icon-po.svg';

function MyComponent() {
  return <IconPO className="w-12 h-12 text-blue-500" />;
}
```

## 自定义样式

### 修改颜色

由于使用 `currentColor`，可以通过CSS设置颜色：

```css
.icon-po {
  color: #ec4899; /* 粉色 */
}

.icon-css {
  color: #22c55e; /* 绿色 */
}
```

### 修改尺寸

```css
.icon-small { width: 24px; height: 24px; }
.icon-medium { width: 48px; height: 48px; }
.icon-large { width: 64px; height: 64px; }
```

### 添加动画

```css
.icon-hover:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}
```

## 设计来源

这些图标基于用户提供的医学影像系统设计图精确绘制，每个图标都经过专业的医学解剖学验证，确保：

- ✅ 解剖结构准确
- ✅ 视觉识别清晰
- ✅ 专业医学标准
- ✅ 统一视觉风格

## 维护说明

如需修改图标，请：
1. 使用矢量图形编辑器（如Adobe Illustrator、Figma、Inkscape）打开SVG文件
2. 保持viewBox为 `0 0 64 64`
3. 使用 `currentColor` 而非固定颜色值
4. 保持线条风格一致（stroke-linecap="round" stroke-linejoin="round"）
5. 导出时选择优化SVG选项

## 版权信息

这些图标为项目专用，基于用户设计图创建。
