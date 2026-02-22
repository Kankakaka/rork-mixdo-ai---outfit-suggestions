import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function GenerateLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mix đồ',
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
