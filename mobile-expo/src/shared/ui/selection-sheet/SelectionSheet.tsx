import { ChoiceSheet } from '@/shared/ui/choice-sheet';
import {
  SelectionList,
  type SelectionListProps,
  type SelectionValue,
} from '@/shared/ui/selection-list';

export interface SelectionSheetProps<
  TValue extends SelectionValue,
> extends SelectionListProps<TValue> {
  title: string;
  open: boolean;
  onClose: () => void;
}

export function SelectionSheet<TValue extends SelectionValue>({
  title,
  open,
  onClose,
  onChange,
  accessibilityLabel = title,
  ...listProps
}: SelectionSheetProps<TValue>) {
  return (
    <ChoiceSheet title={title} open={open} onClose={onClose}>
      <SelectionList
        {...listProps}
        accessibilityLabel={accessibilityLabel}
        onChange={value => {
          // 选择值由调用方持有；查询和分页等业务更新仍由调用方处理。
          onChange(value);
          onClose();
        }}
      />
    </ChoiceSheet>
  );
}
