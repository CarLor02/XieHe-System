import Tooltip from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import type { ImageFile } from '@/services/imageServices/imageFileService';

const MAX_TEAM_DISPLAY_CHARS = 12;
const PERSONAL_OWNERSHIP_LABEL = '仅自己可见';

function truncateText(value: string, maxChars: number) {
  const chars = Array.from(value);
  if (chars.length <= maxChars) {
    return value;
  }
  return `${chars.slice(0, maxChars).join('')}...`;
}

export function getImageOwnershipTeamDisplay(imageFile: ImageFile) {
  const teamNames =
    imageFile.team_names
      ?.map(teamName => teamName.trim())
      .filter(teamName => teamName.length > 0) ?? [];

  const fullText =
    teamNames.length > 0
      ? teamNames.join('、')
      : imageFile.team_ids?.length
        ? `已归属 ${imageFile.team_ids.length} 个团队`
        : PERSONAL_OWNERSHIP_LABEL;

  return {
    fullText,
    displayText: truncateText(fullText, MAX_TEAM_DISPLAY_CHARS),
  };
}

interface ImageOwnershipTeamRowProps {
  imageFile: ImageFile;
  rowClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export default function ImageOwnershipTeamRow({
  imageFile,
  rowClassName,
  labelClassName,
  valueClassName,
}: ImageOwnershipTeamRowProps) {
  const { fullText, displayText } = getImageOwnershipTeamDisplay(imageFile);

  return (
    <div className={cn('flex justify-between gap-4 min-w-0', rowClassName)}>
      <span className={cn('flex-shrink-0', labelClassName)}>归属团队:</span>
      <Tooltip content={fullText} position="top" delay={0}>
        <span
          tabIndex={0}
          title={fullText}
          className={cn(
            'font-medium text-right cursor-help focus:outline-none',
            valueClassName
          )}
        >
          {displayText}
        </span>
      </Tooltip>
    </div>
  );
}
