import type { PropsWithChildren, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Card } from '@/shared/ui';
import { colors } from '@/shared/theme';

export function DashboardSection({
  title,
  accent = colors.primary,
  accessory,
  children,
}: PropsWithChildren<{
  title: string;
  accent?: string;
  accessory?: ReactNode;
}>) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F8FAFC',
        }}
      >
        <View
          style={{
            height: 16,
            width: 4,
            borderRadius: 4,
            backgroundColor: accent,
          }}
        />
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: colors.text,
            flex: 1,
          }}
        >
          {title}
        </Text>
        {accessory}
      </View>
      {children}
    </Card>
  );
}
