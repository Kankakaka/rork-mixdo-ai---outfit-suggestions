import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Sparkles, Wand2, AlertCircle, UserCheck, ImageOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { File as FSFile, Paths } from 'expo-file-system';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useTheme } from '@/hooks/useTheme';
import { useWardrobe } from '@/contexts/WardrobeContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useOutfits } from '@/contexts/OutfitContext';
import OutfitCard from '@/components/OutfitCard';
import { Occasion, OutfitSuggestion, WardrobeItem } from '@/types';
import {
  OCCASION_OPTIONS,
  CELEB_LIST,
  BODY_SHAPE_LABELS,
  SKIN_TONE_LABELS,
  CATEGORY_LABELS,
} from '@/constants/data';

const BODY_SHAPE_TIPS: Record<string, string> = {
  'hourglass': 'Ton duong cong tu nhien, chon do om sat eo',
  'pear': 'Can bang phan tren, chon ao sang mau, vai rong',
  'apple': 'Tao eo ao, chon do V-neck, quan cao eo',
  'rectangle': 'Tao duong cong, chon do layer, thap eo',
  'inverted_triangle': 'Can bang phan duoi, chon quan rong, ao don gian',
  'athletic': 'Them nu tinh, chon do me mem, chi tiet ru re',
};

export default function GenerateScreen() {
  const { colors } = useTheme();
  const { items } = useWardrobe();
  const { profile } = useProfile();
  const { addOutfits, outfits } = useOutfits();

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [celeb, setCeleb] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const animatedValue = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const systemPrompt = useMemo(() => {
    if (!profile) return '';
    const categorizedItems = items.reduce((acc, item) => {
      const cat = CATEGORY_LABELS[item.category] || item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item.description);
      return acc;
    }, {} as Record<string, string[]>);

    const bodyShape = BODY_SHAPE_LABELS[profile.bodyShape] || profile.bodyShape;
    const skinTone = SKIN_TONE_LABELS[profile.skinTone] || profile.skinTone;

    const bodyTip = BODY_SHAPE_TIPS[profile.bodyShape] || '';

    return `You are MixDo AI, an expert fashion advisor for Vietnamese users. Your goal is to suggest outfits ONLY from the user's existing wardrobe items. Do not invent or suggest new items. Generate 4-6 unique outfit combinations that fit the user's profile, the selected occasion, and color harmony/skin tone/body shape. 

User Profile:
- Gender: ${profile.gender}
- Age: ${profile.age}
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Body shape: ${bodyShape} (${bodyTip})
- Skin tone: ${skinTone} (suggest colors that complement, e.g., warm tones for tan skin)

Wardrobe Items (list all with descriptions, separated by category):
${Object.entries(categorizedItems).map(([cat, descs]) => `- ${cat}: ${descs.join(', ')}`).join('\n')}

Occasion: ${occasion || 'Daily wear'}
If inspired by Celeb/KOL: ${celeb || 'None'} (focus on style like elegant casual, minimalistic)

Rules:
- Combine items logically (e.g., 1 top + 1 bottom + 1 shoes + optional outerwear/accessory).
- Prioritize fits: For user's body, suggest outfits that flatter (e.g., add layers for rectangle).
- Color harmony: Match with skin tone (e.g., avoid clashing, suggest pastels for fair skin).
- Output in Vietnamese only.
- For each outfit: 
  1. Mô tả outfit (e.g., "Áo crop top trắng + Quần jeans xanh + Sneaker trắng").
  2. Giải thích lý do (e.g., "Hợp body hình chữ nhật vì tạo đường cong ở eo, màu trung tính phù hợp da vàng, casual cho đi chơi hàng ngày, lấy cảm hứng từ Châu Bùi").
- If not enough items for 4 outfits, generate fewer but explain.
- Keep suggestions positive, encouraging, and culturally relevant to Vietnam (e.g., modest, weather-friendly).`;
  }, [profile, items, occasion, celeb]);

  const userPrompt = useMemo(() => {
    return `Generate 4-6 outfits for occasion: ${occasion || 'Daily wear'}. If celeb: ${celeb || 'None'}.`;
  }, [occasion, celeb]);

  const outfitSchema = z.object({
    description: z.string(),
    reason: z.string(),
    items: z.array(z.object({
      category: z.string(),
      description: z.string(),
    })),
  });

  const generateOutfits = useMutation({
    mutationFn: async () => {
      const variants = await Promise.all([1,2,3].map(async (i) => { // Gen 3 variants to pick best
        return generateObject({
          model: 'gpt-4o',
          system: systemPrompt,
          prompt: userPrompt,
          schema: z.object({ outfits: z.array(outfitSchema) }),
          seed: 42 + i, // Fixed seed with variant to reduce random
        });
      }));
      // Pick best (simple: first; advanced: add score logic if needed)
      return variants[0];
    },
    onSuccess: (data) => {
      const newOutfits = data.outfits.map(o => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        description: o.description,
        reason: o.reason,
        items: o.items,
        isFavorite: false,
        feedback: null,
        feedbackNote: '',
        generatedImageUri: undefined,
        isGeneratingImage: true,
      }));
      addOutfits(newOutfits);
      fadeIn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      Alert.alert('Lỗi', 'Không thể mix đồ lúc này. Vui lòng thử lại.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleGenerate = useCallback(() => {
    if (items.length === 0) {
      Alert.alert('Chưa có đồ', 'Hãy thêm vài món đồ vào tủ trước khi mix nhé!');
      return;
    }
    if (!profile) {
      Alert.alert('Chưa có profile', 'Hãy thiết lập profile trước để gợi ý chính xác hơn!');
      return;
    }
    setGenerating(true);
    generateOutfits.mutate();
    setGenerating(false);
  }, [items, profile, generateOutfits]);

  const hasOutfits = outfits.length > 0;

  const emptyState = (
    <View style={styles.emptyState}>
      <UserCheck stroke={colors.textSecondary} size={48} />
      <Text style={styles.emptyTitle}>Chưa có gợi ý nào</Text>
      <Text style={styles.emptyHint}>Chọn dịp và celeb, rồi bấm Mix cho tôi nhé!</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.resultsSection, { opacity: animatedValue }]}>
        <View style={styles.profilePreview}>
          <View style={styles.profilePreviewLeft}>
            <Text style={styles.profilePreviewTitle}>Profile của bạn</Text>
            <Text style={styles.profilePreviewSub}>{profile?.gender} · ${profile?.age} tuổi</Text>
            <Text style={styles.profilePreviewSub}>{profile?.height}cm · ${profile?.weight}kg</Text>
            <Text style={styles.profilePreviewSub}>{BODY_SHAPE_LABELS[profile?.bodyShape || '']}</Text>
            <Text style={styles.profilePreviewSub}>{SKIN_TONE_LABELS[profile?.skinTone || '']}</Text>
          </View>
          <View style={styles.profilePreviewRight}>
            <Text style={styles.profilePreviewTitle}>Tủ đồ</Text>
            <Text style={styles.profilePreviewSub}>{items.length} món</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>{occasion || 'Chọn dịp'}</Text>
          <Sparkles stroke={colors.primary} size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dropdown}>
          <Text style={styles.dropdownText}>{celeb || 'Chọn celeb'}</Text>
          <Wand2 stroke={colors.primary} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.loadingRow}>
              <Wand2 stroke="#FFFFFF" size={20} />
              <Text style={styles.generateText}>Mix cho tôi</Text>
            </View>
          )}
        </TouchableOpacity>

        {hasOutfits ? (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Gợi ý của bạn</Text>
            <Text style={styles.resultsHint}>Swipe để xem thêm chi tiết</Text>
            {outfits.map((outfit, index) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onFeedback={setFeedback}
                onToggleFavorite={toggleFavorite}
                onRetryTryOn={onRetryTryOn}
                showFeedback={true}
              />
            ))}
          </View>
        ) : emptyState}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  profilePreview: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profilePreviewLeft: {
    alignItems: 'flex-start',
  },
  profilePreviewRight: {
    alignItems: 'flex-end',
  },
  profilePreviewTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  profilePreviewSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnDisabled: {
    opacity: 0.8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  resultsSection: {
    marginTop: 4,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  resultsHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 14,
  },
});
