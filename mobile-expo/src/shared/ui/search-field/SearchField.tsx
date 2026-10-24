import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search-outline" size={19} color={colors.faint} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.searchInput}
      />
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="清空搜索"
          hitSlop={12}
          onPress={() => onChangeText('')}
        >
          <Icon name="close-circle" color={colors.faint} size={18} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 44,
    backgroundColor: '#FFFFFFF2',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
    boxShadow: '0 4px 12px rgba(76,29,149,0.12)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 13,
    outlineWidth: 0,
  },
});
