import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext';
import { WardrobeProvider } from '@/contexts/WardrobeContext';
import { OutfitProvider } from '@/contexts/OutfitContext';
import { useTheme } from '@/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { isOnboarded, isLoading } = useProfile();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === ('onboarding' as any);

    if (!isOnboarded && !inOnboarding) {
      router.replace('/onboarding' as any);
    } else if (isOnboarded && inOnboarding) {
      router.replace('/(tabs)/(home)' as any);
    }
  }, [isOnboarded, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Quay lại',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ProfileProvider>
          <WardrobeProvider>
            <OutfitProvider>
              <NavigationGuard>
                <RootLayoutNav />
              </NavigationGuard>
            </OutfitProvider>
          </WardrobeProvider>
        </ProfileProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
