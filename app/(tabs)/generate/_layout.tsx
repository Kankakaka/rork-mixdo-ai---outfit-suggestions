import { Stack } from 'expo-router';
import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext'; // Import ThemeProvider (if not, add from hooks/useTheme or create)

export default function RootLayout() {
  return (
    <ThemeProvider> // Wrap all to provide colors/theme
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
          
