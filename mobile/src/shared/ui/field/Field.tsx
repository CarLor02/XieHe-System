import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fieldStyles, sizes } from '@/shared/theme';

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[
          fieldStyles.control,
          props.multiline && {
            minHeight: sizes.multilineInput,
            textAlignVertical: 'top',
          },
          props.editable === false && fieldStyles.disabled,
          error && fieldStyles.invalid,
          props.style,
        ]}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={fieldStyles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
