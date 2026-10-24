import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/shared/ui';
import { colors } from '@/shared/theme';
import { GradientIcon } from '@/shared/ui/gradient-icon';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const icon = (name: IconName, focused: boolean) =>
    focused ? (
      <GradientIcon name={name} colors={['#8B5CF6', '#A855F7']} iconSize={20} />
    ) : (
      <View
        style={{
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={name} color={colors.faint} size={22} />
      </View>
    );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          height: 80 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 14,
          flexShrink: 0,
          marginTop: 4,
          fontWeight: '500',
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarIconStyle: { width: 40, height: 40, flexGrow: 0, flexShrink: 0 },
        sceneStyle: { backgroundColor: colors.background },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '工作台',
          tabBarIcon: ({ focused }) =>
            icon(focused ? 'grid' : 'grid-outline', focused),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: '患者中心',
          tabBarIcon: ({ focused }) =>
            icon(focused ? 'people' : 'people-outline', focused),
        }}
      />
      <Tabs.Screen
        name="images"
        options={{
          title: '影像中心',
          tabBarIcon: ({ focused }) =>
            icon(focused ? 'images' : 'images-outline', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '个人中心',
          tabBarIcon: ({ focused }) =>
            icon(focused ? 'person' : 'person-outline', focused),
        }}
      />
    </Tabs>
  );
}
