import { SvgXml } from 'react-native-svg';
import { Icon, type IconName } from '../../../shared/ui';
import { medicalToolIcons } from './medicalToolIcons';

const nativeIcons: Readonly<Record<string, IconName>> = {
  circle: 'ellipse-outline',
  ellipse: 'ellipse-outline',
  rectangle: 'square-outline',
  arrow: 'arrow-forward-outline',
  polygon: 'shapes-outline',
  avt: 'locate-outline',
  lld: 'swap-vertical-outline',
  'hemipelvic-width-ratio': 'resize-outline',
  'vertebra-center': 'scan-outline',
  'aux-horizontal-line': 'swap-horizontal-outline',
  'aux-vertical-line': 'swap-vertical-outline',
};

export function ToolIcon({
  toolId,
  iconId,
  color,
}: {
  toolId: string;
  iconId: string;
  color: string;
}) {
  const xml =
    medicalToolIcons[iconId.replace('medical-', '')] ??
    medicalToolIcons[toolId];
  return xml ? (
    <SvgXml
      xml={xml.replaceAll('currentColor', color)}
      width={32}
      height={32}
    />
  ) : (
    <Icon
      name={nativeIcons[toolId] ?? 'analytics-outline'}
      color={color}
      size={25}
    />
  );
}
