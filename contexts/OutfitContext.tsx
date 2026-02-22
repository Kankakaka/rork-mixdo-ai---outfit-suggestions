import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { OutfitSuggestion } from '@/types';

const OUTFITS_KEY = 'mixdo_outfits';

export const [OutfitProvider, useOutfits] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);

  const outfitsQuery = useQuery({
    queryKey: ['outfits'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(OUTFITS_KEY);
      if (stored) {
        return JSON.parse(stored) as OutfitSuggestion[];
      }
      return [] as OutfitSuggestion[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updatedOutfits: OutfitSuggestion[]) => {
      await AsyncStorage.setItem(OUTFITS_KEY, JSON.stringify(updatedOutfits));
      return updatedOutfits;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['outfits'], data);
    },
  });

  useEffect(() => {
    if (outfitsQuery.data) {
      setOutfits(outfitsQuery.data);
    }
  }, [outfitsQuery.data]);

  const addOutfits = useCallback((newOutfits: OutfitSuggestion[]) => {
    const updated = [...newOutfits, ...outfits];
    setOutfits(updated);
    saveMutation.mutate(updated);
  }, [outfits, saveMutation]);

  const setFeedback = useCallback((id: string, feedback: 'good' | 'bad', note?: string) => {
    const updated = outfits.map(o =>
      o.id === id ? { ...o, feedback, feedbackNote: note } : o
    );
    setOutfits(updated);
    saveMutation.mutate(updated);
  }, [outfits, saveMutation]);

  const toggleFavorite = useCallback((id: string) => {
    const updated = outfits.map(o =>
      o.id === id ? { ...o, isFavorite: !o.isFavorite } : o
    );
    setOutfits(updated);
    saveMutation.mutate(updated);
  }, [outfits, saveMutation]);

  const updateOutfitImage = useCallback((id: string, imageUri: string | undefined, isGenerating: boolean) => {
    const updated = outfits.map(o =>
      o.id === id ? { ...o, generatedImageUri: imageUri, isGeneratingImage: isGenerating } : o
    );
    setOutfits(updated);
    saveMutation.mutate(updated);
  }, [outfits, saveMutation]);

  const favorites = useMemo(() => outfits.filter(o => o.isFavorite), [outfits]);

  return {
    outfits,
    addOutfits,
    setFeedback,
    toggleFavorite,
    updateOutfitImage,
    favorites,
    isLoading: outfitsQuery.isLoading,
  };
});
