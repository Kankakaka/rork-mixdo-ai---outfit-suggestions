import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { WardrobeItem, ClothingCategory } from '@/types';

const WARDROBE_KEY = 'mixdo_wardrobe';

export const [WardrobeProvider, useWardrobe] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<WardrobeItem[]>([]);

  const wardrobeQuery = useQuery({
    queryKey: ['wardrobe'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(WARDROBE_KEY);
      if (stored) {
        return JSON.parse(stored) as WardrobeItem[];
      }
      return [] as WardrobeItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updatedItems: WardrobeItem[]) => {
      await AsyncStorage.setItem(WARDROBE_KEY, JSON.stringify(updatedItems));
      return updatedItems;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['wardrobe'], data);
    },
  });

  useEffect(() => {
    if (wardrobeQuery.data) {
      setItems(wardrobeQuery.data);
    }
  }, [wardrobeQuery.data]);

  const addItem = useCallback((item: WardrobeItem) => {
    const updated = [item, ...items];
    setItems(updated);
    saveMutation.mutate(updated);
  }, [items, saveMutation]);

  const addItems = useCallback((newItems: WardrobeItem[]) => {
    const updated = [...newItems, ...items];
    setItems(updated);
    saveMutation.mutate(updated);
  }, [items, saveMutation]);

  const removeItem = useCallback((id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveMutation.mutate(updated);
  }, [items, saveMutation]);

  const getItemsByCategory = useCallback((category: ClothingCategory) => {
    return items.filter(i => i.category === category);
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  return {
    items,
    addItem,
    addItems,
    removeItem,
    getItemsByCategory,
    categoryCounts,
    isLoading: wardrobeQuery.isLoading,
    totalItems: items.length,
  };
});
