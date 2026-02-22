import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function HistoryLayout() {
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
          title: 'Lịch sử',
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
