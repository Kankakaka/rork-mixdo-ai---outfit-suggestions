import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useOutfits } from '@/contexts/OutfitContext'; // Add this import if not there

export default function GenerateLayout() {
  const { colors } = useTheme();
  const { regenerateOutfits } = useOutfits(); // Assume regenerate function from context, add if needed

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
          headerRight: () => (
            <TouchableOpacity onPress={regenerateOutfits}>
              <RefreshCw color={colors.primary} size={24} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
