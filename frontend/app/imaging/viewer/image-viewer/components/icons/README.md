# 医学测量图标组件

## 概述

本目录包含所有医学测量的自定义SVG图标组件，这些图标基于医学解剖图设计，专业直观地展示各类脊柱和骨盆测量。

## 文件结构

```
icons/
├── MedicalIcons.tsx    # 所有医学图标组件定义
├── IconMapper.tsx      # 图标映射工具，根据ID渲染对应图标
└── README.md          # 本文件
```

## 可用图标

### 脊柱测量图标

| 图标ID | 组件名称 | 用途 |
|--------|---------|------|
| `medical-po` | IconPO | 骨盆倾斜角 (Pelvic Obliquity) |
| `medical-css` | IconCSS | 冠状面骶骨倾斜角 (Coronal Sacral Slope) |
| `medical-ss` | IconSS | 骶骨倾斜角 (Sacral Slope) |
| `medical-cobb` | IconCobb | Cobb角 |
| `medical-ts` | IconTS | 躯干偏移量 (Trunk Shift, 4点法) |
| `medical-tts` | IconTTS | C7偏移距离 (Trunk Shift, 6点法) |

### 骨盆测量图标

| 图标ID | 组件名称 | 用途 |
|--------|---------|------|
| `medical-pi` | IconPI | 骨盆入射角 (Pelvic Incidence) |
| `medical-pt` | IconPT | 骨盆倾角 (Pelvic Tilt) |
| `medical-tpa` | IconTPA | 躯干骨盆角 (Trunk Pelvic Angle) |
| `medical-sva` | IconSVA | 矢状面垂直轴 (Sagittal Vertical Axis) |

### 辅助工具图标

| 图标ID | 组件名称 | 用途 |
|--------|---------|------|
| `medical-aux-length` | IconAuxLength | 辅助距离测量 |
| `medical-aux-angle-3` | IconAuxAngle3 | 辅助角度测量 (3点) |
| `medical-aux-angle-4` | IconAuxAngle4 | 辅助角度测量 (4点) |

## 使用方法

### 1. 在配置中使用

在 `annotation-catalog.ts` 中配置图标：

```typescript
export const COBB_CONFIG: AnnotationConfig = {
  id: 'cobb',
  name: 'Cobb',
  icon: 'medical-cobb',  // 使用医学图标
  description: 'Cobb角测量',
  // ...其他配置
};
```

### 2. 直接使用图标组件

```typescript
import { IconCobb, IconPI } from './components/icons/MedicalIcons';

// 在组件中使用
<IconCobb className="w-6 h-6 text-blue-500" />
<IconPI className="w-8 h-8" style={{ color: '#ef4444' }} />
```

### 3. 使用图标映射器

```typescript
import IconMapper from './components/icons/IconMapper';

// 根据ID动态渲染图标
<IconMapper iconId="medical-po" className="w-6 h-6" />
<IconMapper iconId="medical-css" className="w-8 h-8 text-green-500" />

// 后备使用RemixIcon
<IconMapper iconId="ri-home-line" className="w-6 h-6" />
```

## 图标设计规范

所有医学图标遵循以下设计规范：

- **尺寸**: 48x48 viewBox
- **线宽**: 1.5px (strokeWidth="1.5")
- **颜色**: 使用 `currentColor`，支持通过className或style动态设置颜色
- **风格**: 线条简洁，符合医学专业需求
- **填充**: 默认无填充 (fill="none")

## 添加新图标

要添加新的医学图标：

1. 在 `MedicalIcons.tsx` 中创建新的图标组件
2. 在 `IconMapper.tsx` 的 `ICON_MAP` 中注册新图标
3. 在配置中使用新的图标ID

示例：

```typescript
// 1. 在 MedicalIcons.tsx 中添加
export const IconNewMeasure = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 48 48" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* SVG路径 */}
  </svg>
);

// 2. 在 IconMapper.tsx 中注册
const ICON_MAP = {
  'medical-new-measure': MedicalIcons.IconNewMeasure,
  // ...其他图标
};

// 3. 在配置中使用
export const NEW_MEASURE_CONFIG: AnnotationConfig = {
  icon: 'medical-new-measure',
  // ...
};
```

## 图标预览

所有图标的视觉设计均基于医学解剖结构，确保：
- ✅ 专业性：符合医学影像学标准
- ✅ 识别性：一眼即可识别测量类型
- ✅ 一致性：统一的视觉风格
- ✅ 可访问性：支持颜色定制，适配各种主题
