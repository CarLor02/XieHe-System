/**
 * 医学测量图标组件
 * 基于用户设计图中的医学解剖图标精确重绘
 */

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

// PO (Pelvic) - 骨盆倾斜角
// 正面骨盆，显示髂骨翼和髋臼
export const IconPO = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 左侧髂骨翼 */}
    <path d="M 18 20 Q 14 22, 12 28 L 12 36 Q 12 42, 16 46 L 20 50" />
    {/* 右侧髂骨翼 */}
    <path d="M 46 20 Q 50 22, 52 28 L 52 36 Q 52 42, 48 46 L 44 50" />
    {/* 骶骨 */}
    <path d="M 26 18 L 26 24 L 38 24 L 38 18" />
    <line x1="26" y1="18" x2="38" y2="18" />
    {/* 左髋臼 */}
    <ellipse cx="20" cy="52" rx="5" ry="6" />
    {/* 右髋臼 */}
    <ellipse cx="44" cy="52" rx="5" ry="6" />
    {/* 闭孔 */}
    <ellipse cx="24" cy="44" rx="3" ry="4" opacity="0.5" />
    <ellipse cx="40" cy="44" rx="3" ry="4" opacity="0.5" />
  </svg>
);

// CSS (Sacral) - 冠状面骶骨倾斜角
// 正面骶骨形状
export const IconCSS = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 骶骨外轮廓 */}
    <path d="M 28 16 L 26 22 L 24 30 L 24 38 Q 24 44, 28 48 L 32 50 L 36 48 Q 40 44, 40 38 L 40 30 L 38 22 L 36 16 Z" />
    {/* 骶骨横线 */}
    <line x1="28" y1="20" x2="36" y2="20" opacity="0.7" />
    <line x1="26" y1="26" x2="38" y2="26" opacity="0.7" />
    <line x1="25" y1="34" x2="39" y2="34" opacity="0.7" />
    <line x1="26" y1="42" x2="38" y2="42" opacity="0.7" />
  </svg>
);

// SS (Sacral Slope) - 骶骨倾斜角
// 侧面骶骨
export const IconSS = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 骶骨侧面轮廓 */}
    <path d="M 24 18 Q 28 16, 34 18 L 38 24 L 40 32 L 40 42 Q 40 48, 36 52 L 32 54 Q 28 54, 26 52 Q 22 48, 22 42 L 22 32 L 24 24 Z" />
    {/* 骶骨分段线 */}
    <path d="M 26 22 Q 30 20, 36 22" opacity="0.6" />
    <path d="M 24 28 L 38 30" opacity="0.6" />
    <path d="M 23 36 L 39 38" opacity="0.6" />
  </svg>
);

// Cobb角 - 脊柱侧弯角度
// 显示倾斜的椎体和测量线
export const IconCobb = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 上端椎体（左倾） */}
    <rect x="22" y="16" width="16" height="8" rx="1" transform="rotate(-12 30 20)" />
    {/* 中间椎体 */}
    <rect x="26" y="28" width="14" height="7" rx="1" />
    {/* 下端椎体（右倾） */}
    <rect x="24" y="42" width="16" height="8" rx="1" transform="rotate(10 32 46)" />
    {/* 上端终板线延长线 */}
    <line x1="12" y1="18" x2="48" y2="14" strokeDasharray="3,2" opacity="0.7" />
    {/* 下端终板线延长线 */}
    <line x1="14" y1="48" x2="50" y2="52" strokeDasharray="3,2" opacity="0.7" />
  </svg>
);

// TS (Trunk Shift) - 躯干偏移 (4点法)
// 多个椎体偏移
export const IconTS = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 椎体序列 */}
    <rect x="26" y="12" width="12" height="6" rx="1" />
    <rect x="24" y="20" width="12" height="6" rx="1" />
    <rect x="28" y="28" width="12" height="6" rx="1" />
    <rect x="30" y="36" width="12" height="6" rx="1" />
    <rect x="32" y="44" width="12" height="6" rx="1" />
    {/* 中心参考线 */}
    <line x1="32" y1="10" x2="32" y2="52" strokeDasharray="2,2" opacity="0.5" />
    <line x1="38" y1="10" x2="38" y2="52" strokeDasharray="2,2" opacity="0.5" />
  </svg>
);

// TTS (C7 Offset) - C7偏移距离
// 侧面脊柱，显示C7和垂直参考线
export const IconTTS = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 脊柱曲线 */}
    <path d="M 32 12 Q 28 20, 26 28 Q 25 36, 28 44 Q 30 52, 32 58" strokeWidth="1.8" />
    {/* C7椎体 */}
    <circle cx="32" cy="14" r="4" />
    <rect x="28" y="22" width="10" height="6" rx="1" />
    <rect x="26" y="32" width="10" height="6" rx="1" />
    <rect x="27" y="42" width="10" height="6" rx="1" />
    {/* 垂直参考线 */}
    <line x1="32" y1="10" x2="32" y2="56" strokeDasharray="2,2" opacity="0.4" />
  </svg>
);

// TPA - 躯干骨盆角
// 侧面人体，显示躯干和骨盆
export const IconTPA = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 躯干线 */}
    <path d="M 36 12 L 34 22 L 32 32 L 32 42" strokeWidth="1.8" />
    {/* 骨盆侧面 */}
    <path d="M 24 42 Q 26 38, 32 38 L 36 42 Q 36 48, 32 52 Q 28 54, 24 52 Z" />
    {/* 髋关节 */}
    <ellipse cx="26" cy="52" rx="5" ry="4" />
    {/* 测量线 */}
    <line x1="22" y1="32" x2="38" y2="32" strokeDasharray="2,2" opacity="0.6" />
    <line x1="32" y1="42" x2="24" y2="48" strokeDasharray="2,2" opacity="0.6" />
  </svg>
);

// SVA - 矢状面垂直轴
// C7和骶骨的垂直关系
export const IconSVA = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* C7椎体 */}
    <rect x="26" y="12" width="12" height="8" rx="1" />
    {/* 骶骨 */}
    <path d="M 24 48 L 28 54 L 32 56 L 36 54 L 40 48 L 38 42 L 26 42 Z" />
    {/* C7铅垂线（C7PL） */}
    <line x1="32" y1="20" x2="32" y2="56" strokeDasharray="3,2" />
    {/* 骶骨后缘标记 */}
    <circle cx="32" cy="48" r="2" fill="currentColor" />
  </svg>
);

// PI - 骨盆入射角
// 骨盆侧面，显示骶骨上终板和股骨头
export const IconPI = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 骶骨侧面 */}
    <path d="M 22 20 Q 26 18, 32 20 L 36 28 L 38 38 Q 38 44, 34 48 L 30 50 Q 26 50, 24 48 Q 20 44, 20 38 L 20 28 Z" />
    {/* 髋关节/股骨头 */}
    <circle cx="26" cy="52" r="6" />
    {/* 骶骨上终板中点到股骨头中心连线 */}
    <line x1="26" y1="52" x2="34" y2="24" strokeDasharray="2,2" opacity="0.7" />
    {/* 骶骨中垂线 */}
    <line x1="29" y1="20" x2="29" y2="36" strokeDasharray="2,2" opacity="0.7" />
  </svg>
);

// PT (Pelvic Tilt) - 骨盆倾角
// 骨盆侧面，强调倾斜角度
export const IconPT = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 骶骨侧面 */}
    <path d="M 22 20 Q 26 18, 32 20 L 36 28 L 38 38 Q 38 44, 34 48 L 30 50 Q 26 50, 24 48 Q 20 44, 20 38 L 20 28 Z" />
    {/* 髋关节/股骨头 */}
    <circle cx="26" cy="52" r="6" />
    {/* 水平参考线 */}
    <line x1="18" y1="52" x2="36" y2="52" strokeDasharray="2,2" opacity="0.7" />
    {/* 骶骨上终板中点到股骨头中心连线 */}
    <line x1="26" y1="52" x2="34" y2="24" strokeDasharray="2,2" opacity="0.7" />
  </svg>
);

// 辅助距离
export const IconAuxLength = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* 水平双箭头 */}
    <line x1="16" y1="32" x2="48" y2="32" />
    <polyline points="18,28 16,32 18,36" />
    <polyline points="46,28 48,32 46,36" />
    {/* 端点标记 */}
    <line x1="16" y1="26" x2="16" y2="38" />
    <line x1="48" y1="26" x2="48" y2="38" />
  </svg>
);

// 辅助角度 (3点)
export const IconAuxAngle3 = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* 三点角度 */}
    <line x1="16" y1="48" x2="32" y2="20" />
    <line x1="32" y1="20" x2="48" y2="48" />
    {/* 角度弧 */}
    <path d="M 22 42 A 12 12 0 0 1 42 42" fill="none" />
  </svg>
);

// 辅助角度 (4点)
export const IconAuxAngle4 = ({ className, style }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* 两条相交线 */}
    <line x1="14" y1="24" x2="50" y2="28" />
    <line x1="14" y1="36" x2="50" y2="40" />
    {/* 角度标记线 */}
    <line x1="28" y1="26" x2="28" y2="38" strokeDasharray="2,2" opacity="0.6" />
  </svg>
);
