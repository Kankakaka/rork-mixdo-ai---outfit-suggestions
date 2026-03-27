import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { UserProfile } from '@/types';

const PROFILE_KEY = 'mixdo_profile';

const DEFAULT_PROFILE: UserProfile = {
  gender: 'nu',
  age: 25,
  height: 160,
  weight: 50,
  bodyShape: 'rectangle',
  skinTone: 'medium',
  isOnboarded: false,
};

export const [ProfileProvider, useProfile] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
      return DEFAULT_PROFILE;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updated: UserProfile) => {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    saveMutation.mutate(updated);
  }, [profile, saveMutation]);

  const completeOnboarding = useCallback(() => {
    updateProfile({ isOnboarded: true });
  }, [updateProfile]);

  const setFullBodyPhoto = useCallback((uri: string | undefined) => {
    updateProfile({ fullBodyPhotoUri: uri });
  }, [updateProfile]);

  return {
    profile,
    updateProfile,
    completeOnboarding,
    setFullBodyPhoto,
    isLoading: profileQuery.isLoading,
    isOnboarded: profile.isOnboarded,
    hasFullBodyPhoto: !!profile.fullBodyPhotoUri,
  };
});
