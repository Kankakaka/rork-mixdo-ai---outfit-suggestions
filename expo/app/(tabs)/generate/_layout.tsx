import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { createContext, useContext } from 'react'; // If ThemeContext not exist, add this

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const scheme = useColorScheme(); // Auto light/dark
  const theme = scheme === 'dark' ? 'dark' : 'light';

  const colors = {
    light: {
      background: '#F5F5DC', // Beige
      primary: '#FFB6C1', // Pink
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      surface: '#FFF',
      shadow: '#000',
    },
    dark: {
      background: '#121212',
      primary: '#BB86FC', // Soft blue alternative
      text: '#FFF',
      textSecondary: '#BBB',
      textTertiary: '#888',
      surface: '#1E1E1E',
      shadow: '#000',
    },
  }[theme];

  return (
    <ThemeContext.Provider value={{ colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
