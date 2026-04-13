/**
 * 图标映射组件
 * 根据图标ID渲染对应的图标
 */

import React from 'react';
import * as MedicalIcons from './MedicalIcons';

interface IconMapperProps {
  iconId: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 图标映射表
 * 将annotation config中的icon字段映射到对应的图标组件
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  // 医学测量图标
  'medical-po': MedicalIcons.IconPO,
  'medical-css': MedicalIcons.IconCSS,
  'medical-ss': MedicalIcons.IconSS,
  'medical-cobb': MedicalIcons.IconCobb,
  'medical-ts': MedicalIcons.IconTS,
  'medical-tts': MedicalIcons.IconTTS,
  'medical-tpa': MedicalIcons.IconTPA,
  'medical-sva': MedicalIcons.IconSVA,
  'medical-pi': MedicalIcons.IconPI,
  'medical-pt': MedicalIcons.IconPT,
  'medical-aux-length': MedicalIcons.IconAuxLength,
  'medical-aux-angle-3': MedicalIcons.IconAuxAngle3,
  'medical-aux-angle-4': MedicalIcons.IconAuxAngle4,
};

/**
 * 图标渲染组件
 * 支持自定义医学图标和RemixIcon后备
 */
export const IconMapper: React.FC<IconMapperProps> = ({ iconId, className = '', style }) => {
  // 如果是医学图标
  if (iconId.startsWith('medical-')) {
    const IconComponent = ICON_MAP[iconId];
    if (IconComponent) {
      return <IconComponent className={className} style={style} />;
    }
  }

  // 后备使用RemixIcon
  return <i className={`${iconId} ${className}`} style={style}></i>;
};

export default IconMapper;
