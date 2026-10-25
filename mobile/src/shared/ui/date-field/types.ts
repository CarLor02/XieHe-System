export interface DateFieldProps {
  label: string;
  /** 日历日期使用 YYYY-MM-DD；空字符串表示清空，不包含时间或时区。 */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
}
