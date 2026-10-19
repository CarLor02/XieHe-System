import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../../shared/ui';
import { colors } from '../../../shared/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const icon = (name: IconName, focused: boolean) => (
    <View
      style={{
        width: 40,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primary : 'transparent',
      }}
    >
      <Icon name={name} color={focused ? '#FFF' : colors.faint} size={21} />
    </View>
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          height: 74 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 10, marginTop: 5 },
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
