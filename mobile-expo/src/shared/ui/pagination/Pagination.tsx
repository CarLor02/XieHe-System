import { Text, View } from 'react-native';
import { layout } from '../../theme';
import { Button } from '../button';

export function Pagination({
  page,
  total,
  pageSize = 20,
  loading,
  onChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <View style={layout.between}>
      <Button
        title="上一页"
        variant="secondary"
        compact
        disabled={loading || page <= 1}
        onPress={() => onChange(page - 1)}
      />
      <Text style={layout.muted}>
        {page} / {pages}
      </Text>
      <Button
        title="下一页"
        variant="secondary"
        compact
        disabled={loading || page >= pages}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}
