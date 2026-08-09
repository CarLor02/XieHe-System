import type { AnnotationConfig } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-types';
import {
  calculateTtsResults,
  isTtsInRange,
} from '@xiehe/imaging-core/measurements/ap';
import type { Point } from '@xiehe/imaging-core/contracts';

export const TTS_CONFIG: AnnotationConfig = {
  id: 'tts',
  name: 'TTS',
  icon: 'medical-tts',
  description: '胸廓躯干偏移TTS(Thoracic Trunk Shift)',
  pointsNeeded: 4,
  category: 'measurement',
  color: '#84cc16',
  maxXRightLabel: true,

  calculateResults: calculateTtsResults,

  getLabelPosition: (points: Point[]) => {
    if (points.length < 4) return points[0] || { x: 0, y: 0 };
    const trunkMidX = (points[0].x + points[1].x) / 2;
    const trunkMidY = (points[0].y + points[1].y) / 2;
    const sacralMidX = (points[2].x + points[3].x) / 2;
    const sacralMidY = (points[2].y + points[3].y) / 2;
    // maxXRightLabel=true：渲染层用 labelPosition.x（屏幕坐标）做锚点，
    // 文字左缘 = screen(X) + gap + textWidth/2。
    // 此处 X 只需返回连接箭头右端（两条线中点的较大 X），
    // 而不是躯干线最右端点（会让标签跑到图像最右边）。
    return {
      x: Math.max(trunkMidX, sacralMidX),
      y: (trunkMidY + sacralMidY) / 2,
    };
  },

  isInHoverRange: isTtsInRange,
  isInSelectionRange: isTtsInRange,

  rendererId: 'tts',
};
