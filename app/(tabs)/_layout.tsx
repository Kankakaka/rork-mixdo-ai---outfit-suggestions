import { Tabs } from 'expo-router';
import React from 'react';
import { Shirt, Wand2, Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Tủ đồ',
          tabBarIcon: ({ color, size }) => <Shirt size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: 'Mix đồ',
          tabBarIcon: ({ color, size }) => <Wand2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
