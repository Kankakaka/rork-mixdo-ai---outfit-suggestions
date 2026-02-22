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
  hourglass: 'ton duong cong tu nhien, eo thon, chon do om vua, V-neck, wrap dress, high-waist',
  pear: 'can bang phan tren va duoi, top sang mau/chi tiet vai, bottom toi mau, A-line skirt, boot-cut',
  apple: 'tao cam giac thon gon vung bung, ao dai qua hong, V-neck sau, quan ong rong, empire waist',
  rectangle: 'tao duong cong, dung layer de them chieu sau, belt o eo, peplum top, ao crop voi high-waist, jacket co cau truc',
  inverted_triangle: 'can bang vai rong, bottom sang mau/pattern, wide-leg pants, A-line skirt, raglan sleeve',
  athletic: 'ton co the, fitted nhung khong qua chat, ao co chi tiet, quan jogger, bomber jacket',
};

const SKIN_TONE_COLORS: Record<string, string> = {
  fair: 'mau pastel (hong, xanh nhat, lavender), jewel tones (emerald, sapphire), tranh mau qua nhat/washed out',
  medium: 'mau am (be, camel, olive, terracotta, rust), earth tones, mau trung tinh am, navy, forest green, burgundy - rat hop da vang',
  tan: 'mau trung tinh am (camel, khaki, olive), jewel tones (ruby, gold), tranh mau neon, pastel qua nhat',
  dark: 'mau tuoi sang (do, vang, emerald, cobalt), trang, kem, mau metallic, contrast cao dep',
};

const CELEB_STYLES: Record<string, string> = {
  'Châu Bùi': 'high fashion mix streetwear, bold, edgy nhung tinh te, layer nhieu, accessories noi bat, mau trung tinh pha accent manh',
  'Quỳnh Anh Shyn': 'colorful, playful, Y2K retro, mix match pattern, girly nhung ca tinh, mau pop',
  'Chi Pu': 'sang trong, goi cam tinh te, mau don sac, form om, high-end casual, den-trang la chu dao',
  'Hana Giang Anh': 'sporty chic, khoe dang, athleisure sang trong, crop top + high-waist, mau earth tone',
  'Khánh Linh Bùi': 'minimalist luxury, tailored, mau trung tinh (be, den, trang, xam), form clean, chat lieu cao cap',
  'Chloe Nguyen': 'elegant casual, preppy vibe, pastel, ao blazer mix thoai mai, trang-be-hong nhat',
  'Hương Giang': 'nu tinh, sang trong, form fitting, mau jewel tones, accessories tinh te, giay cao got',
  'Sơn Tùng M-TP': 'trendy casual nam, streetwear sang trong, oversized nhung clean, layer jacket, sneaker statement, mau toi + accent',
  'Minh Tú': 'bold va tu tin, power dressing, blazer oversize, mau don sac manh, form cao cap',
  'Wyn Anh': 'soft girl aesthetic, pastel, nhieu layer nhe, mau hong-trang-kem, accessories nho xinh',
  'Tóc Tiên': 'edgy glam, den la chu dao, leather mix vai mem, cool girl vibe, accessories statement',
  'Ninh Dương Lan Ngọc': 'thanh lich casual, mau trung tinh, smart casual, blazer + jeans, trang-be-den',
  'Đông Nhi': 'nu tinh hien dai, mau tuoi, mix sporty va girly, sneaker voi vay, thoai mai nhung dep',
  'Hà Hồ': 'high fashion, luxury minimalist, form clean, mau trung tinh sang trong, tailored, den-trang-be',
  'Binz': 'streetwear flex, hip-hop casual, oversized hoodie/tee, sneaker hype, mau toi + do statement',
};

const OCCASION_TIPS: Record<string, string> = {
  travel: 'thoai mai, de di chuyen, vai nhe thoang, layer de thay doi theo thoi tiet, giay di bo, backpack friendly, khong qua cau ky',
  party: 'noi bat, sang trong, co diem nhan, chat lieu dep (satin, linen tot), accessories, giay dep, mau tuoi hoac jewel tones',
  date: 'an tuong nhung tu nhien, ton dang, mau am/soft, gon gang, thoang nhe nhung co diem nhan, giay sach dep',
  weather: 'phu hop thoi tiet VN (nong am), vai cotton/linen thoang mat, mau sang, tranh vai day nang, non/kinh mat',
  celeb: 'theo phong cach celeb da chon, co the dieu chinh cho phu hop body va wardrobe hien co',
};

async function readImageAsBase64(uri: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log('[MixDo] Web platform - fetching image as base64...');
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
    const file = new FSFile(uri);
    if (!file.exists) {
      console.error('[MixDo] File does not exist:', uri);
      return null;
    }
    const base64 = await file.base64();
    return base64;
  } catch (error) {
    console.error('[MixDo] Error reading image as base64:', error);
    return null;
  }
}

async function saveBase64AsImage(base64Data: string, filename: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return `data:image/png;base64,${base64Data}`;
    }
    const file = new FSFile(Paths.cache, filename);
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    file.write(bytes);
    console.log('[MixDo] Saved try-on image:', file.uri);
    return file.uri;
  } catch (error) {
    console.error('[MixDo] Error saving image:', error);
    return null;
  }
}

function buildTryOnPrompt(
  outfitItems: WardrobeItem[],
  genderLabel: string,
  age: number,
  height: number,
  weight: number,
  bodyShapeLabel: string,
  skinToneLabel: string,
): string {
  const tops = outfitItems.filter(i => i.category === 'top' || i.category === 'outerwear');
  const bottoms = outfitItems.filter(i => i.category === 'bottom');
  const shoes = outfitItems.filter(i => i.category === 'shoes');
  const accessories = outfitItems.filter(i => i.category === 'accessory');

  const garmentParts: string[] = [];
  tops.forEach(t => garmentParts.push(t.label));
  bottoms.forEach(b => garmentParts.push(b.label));
  shoes.forEach(s => garmentParts.push(s.label));
  accessories.forEach(a => garmentParts.push(a.label));

  const garmentDesc = garmentParts.join(', ');

  const isMale = genderLabel === 'Nam';
  const personLabel = isMale ? 'man' : genderLabel === 'Nu' ? 'woman' : 'person';

  const maleSpecificContext = isMale
    ? `\nSPECIFIC CONTEXT FOR THIS MALE PHOTO:
- This is a Vietnamese man taking a mirror selfie with his phone
- Keep EXACT body pose: hands in pockets or holding phone, standing stance, leaning angle
- Keep EXACT face: male facial features, hair, expression (e.g. looking down at phone), skin tone unchanged
- Keep EXACT mirror selfie environment: black-white striped curtains, blue chair, olive tree plant, kitchen sink, mirror reflection, all room details, natural daylight from window
- Keep EXACT mirror reflection angle, phone position, hand grip
- The clothing mask area is ONLY the torso (shirt/jacket area), legs (pants/shorts area), and feet (shoes area) - do NOT touch face, hair, hands, arms skin, or any background pixel`
    : '';

  const femaleSpecificContext = genderLabel === 'Nu'
    ? `\nSPECIFIC CONTEXT FOR THIS FEMALE PHOTO:
- Keep EXACT face, hair, makeup, expression, skin tone unchanged
- Keep EXACT body pose, hand positions, stance, body proportions
- Keep EXACT background environment, room details, lighting, shadows, reflections
- The clothing mask area is ONLY the torso, legs, and feet - do NOT touch face, hair, hands, arms skin, or any background pixel`
    : '';

  return `Edit this exact real-life photo of a Vietnamese ${personLabel}, ${age} years old, ${height}cm tall, ${weight}kg, ${bodyShapeLabel} body shape, ${skinToneLabel} skin tone.${maleSpecificContext}${femaleSpecificContext}

CRITICAL RULES - MUST FOLLOW:
1. Keep the EXACT same face, hair, hairstyle, expression, facial features completely unchanged - zero modification to identity
2. Keep the EXACT same body pose, hand positions, body proportions, stance, leaning angle unchanged
3. Keep the EXACT same background - every single object, furniture, wall, curtain pattern, plant, chair color, sink, mirror, lighting direction, shadows, reflections must remain 100% pixel-identical
4. Keep the EXACT same photo quality, camera angle, perspective, grain, color temperature, white balance
5. Do NOT add, remove, move, or alter ANY background elements - not even slightly
6. Do NOT change the person's identity, skin color, body shape, muscle definition, or any physical features
7. Do NOT generate a new person, new pose, or new background under any circumstances
8. MASK ONLY the clothing/shoes region on the body - leave all skin, face, hair, background pixels untouched

ONLY CHANGE: Replace the clothing and shoes the person is currently wearing with: ${garmentDesc}

Clothing replacement rules:
- New clothing must fit naturally on the EXACT same body shape and pose
- Realistic fabric drape, wrinkles, and creases matching the body's stance
- Shadows on clothing must match the EXISTING lighting direction in the photo
- Clothing edges must blend seamlessly with exposed skin (arms, neck, legs)
- The result should look like the person actually wore these exact items when the original photo was taken
- Maintain the same level of clothing fit (not tighter or looser than realistic)

Output: High resolution, photorealistic, no artifacts, no deformation, no blurring, no uncanny valley effect.`;
}

export default function GenerateScreen() {
  const { colors } = useTheme();
  const { items } = useWardrobe();
  const { profile } = useProfile();
  const { addOutfits, setFeedback, toggleFavorite, updateOutfitImage } = useOutfits();

  const [occasion, setOccasion] = useState<Occasion>('travel');
  const [selectedCeleb, setSelectedCeleb] = useState(CELEB_LIST[0]);
  const [generatedOutfits, setGeneratedOutfits] = useState<OutfitSuggestion[]>([]);
  const [tryOnProgress, setTryOnProgress] = useState<Record<string, boolean>>({});

  const buttonScale = useRef(new Animated.Value(1)).current;

  const genderLabel = profile.gender === 'nam' ? 'Nam' : profile.gender === 'nu' ? 'Nu' : 'Khac';
  const bodyShapeLabel = BODY_SHAPE_LABELS[profile.bodyShape];
  const skinToneLabel = SKIN_TONE_LABELS[profile.skinTone];

  const generateTryOnImage = useCallback(async (outfit: OutfitSuggestion) => {
    if (!profile.fullBodyPhotoUri || outfit.items.length === 0) {
      console.log('[MixDo] No full body photo or no items, skipping try-on');
      return;
    }

    const outfitId = outfit.id;
    console.log('[MixDo] Starting try-on image generation for outfit:', outfitId);

    setTryOnProgress(prev => ({ ...prev, [outfitId]: true }));
    setGeneratedOutfits(prev => prev.map(o =>
      o.id === outfitId ? { ...o, isGeneratingImage: true } : o
    ));

    try {
      const userPhotoBase64 = await readImageAsBase64(profile.fullBodyPhotoUri);
      if (!userPhotoBase64) {
        throw new Error('Could not read user photo');
      }
      console.log('[MixDo] User photo loaded, size:', userPhotoBase64.length);

      const images: Array<{ type: 'image'; image: string }> = [
        { type: 'image', image: userPhotoBase64 },
      ];

      for (const item of outfit.items) {
        const itemUri = item.croppedUri || item.imageUri;
        const itemBase64 = await readImageAsBase64(itemUri);
        if (itemBase64) {
          images.push({ type: 'image', image: itemBase64 });
          console.log('[MixDo] Loaded clothing item:', item.label);
        }
      }

      const prompt = buildTryOnPrompt(
        outfit.items,
        genderLabel,
        profile.age,
        profile.height,
        profile.weight,
        bodyShapeLabel,
        skinToneLabel,
      );

      console.log('[MixDo] Calling image edit API with', images.length, 'images...');
      console.log('[MixDo] Prompt:', prompt.substring(0, 200) + '...');

      const response = await fetch('https://toolkit.rork.com/images/edit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          images,
          aspectRatio: '3:4',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MixDo] Image edit API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('[MixDo] Image edit API success, saving result...');

      if (result.image?.base64Data) {
        const filename = `tryon_${outfitId}_${Date.now()}.png`;
        const savedUri = await saveBase64AsImage(result.image.base64Data, filename);

        if (savedUri) {
          console.log('[MixDo] Try-on image saved:', savedUri);
          setGeneratedOutfits(prev => prev.map(o =>
            o.id === outfitId ? { ...o, generatedImageUri: savedUri, isGeneratingImage: false } : o
          ));
          updateOutfitImage(outfitId, savedUri, false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
      }

      throw new Error('No image data in response');
    } catch (error) {
      console.error('[MixDo] Try-on generation failed:', error);
      setGeneratedOutfits(prev => prev.map(o =>
        o.id === outfitId ? { ...o, isGeneratingImage: false } : o
      ));
      updateOutfitImage(outfitId, undefined, false);
    } finally {
      setTryOnProgress(prev => ({ ...prev, [outfitId]: false }));
    }
  }, [profile, genderLabel, bodyShapeLabel, skinToneLabel, updateOutfitImage]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (items.length < 2) {
        throw new Error('NOT_ENOUGH_ITEMS');
      }

      const wardrobeSummary = items.map((item, idx) => (
        `[${idx}] ${CATEGORY_LABELS[item.category]}: ${item.label} (mau: ${item.color})`
      )).join('\n');

      const occasionLabel = OCCASION_OPTIONS.find(o => o.value === occasion)?.label || occasion;
      const bodyTip = BODY_SHAPE_TIPS[profile.bodyShape] || '';
      const skinColorTip = SKIN_TONE_COLORS[profile.skinTone] || '';
      const occasionTip = OCCASION_TIPS[occasion] || '';

      let celebSection = '';
      if (occasion === 'celeb' && selectedCeleb) {
        const celebStyle = CELEB_STYLES[selectedCeleb] || 'phong cach doc dao, thoi trang';
        celebSection = `\n\n=== PHONG CACH CELEB ===\nInspo: ${selectedCeleb}\nDac trung: ${celebStyle}\nLuu y: Dieu chinh cho phu hop body ${bodyShapeLabel} va wardrobe hien co. Khong can copy 100%, lay tinh than va mood cua celeb.`;
      }

      const systemPrompt = `Ban la MixDo AI, chuyen gia tu van thoi trang cho nguoi Viet. Hay tao 4-6 outfit doc dao CHI TU nhung mon do trong tu cua nguoi dung. Tuyet doi KHONG de xuat do moi.

Thong tin nguoi dung:
- Gioi tinh: ${genderLabel}, Tuoi: ${profile.age}
- Chieu cao: ${profile.height}cm, Can nang: ${profile.weight}kg
- Dang nguoi: ${bodyShapeLabel} => ${bodyTip}
- Tong da: ${skinToneLabel} => Mau hop: ${skinColorTip}

Tu quan ao:
${wardrobeSummary}

Dip mac: ${occasionLabel}
=> ${occasionTip}${celebSection}

Quy tac:
1. CHI dung do trong tu (theo index). KHONG them do moi.
2. Moi outfit: 1 top + 1 bottom + 1 shoes (+ accessory/outerwear neu co).
3. 4 outfit phai KHAC NHAU ro rang, moi set co mood rieng.
4. Phoi mau phu hop tong da ${skinToneLabel}, ton dang ${bodyShapeLabel}.
5. Mo ta cu the outfit tren nguoi ${profile.height}cm ${profile.weight}kg.
6. Viet tieng Viet tu nhien, tich cuc, nhu stylist tu van.
7. Giu goi y tich cuc, khong che bai co the nguoi dung. Tap trung vao cach ton dang.`;

      console.log('[MixDo] Generating outfits with original prompt...');
      console.log('[MixDo] Profile:', genderLabel, profile.age, profile.height, profile.weight, bodyShapeLabel, skinToneLabel);
      console.log('[MixDo] Occasion:', occasionLabel, occasion === 'celeb' ? selectedCeleb : '');
      console.log('[MixDo] Wardrobe items:', items.length);

      const result = await generateObject({
        messages: [
          { role: 'user', content: systemPrompt + `\n\n---\nHay phoi 4 outfit doc dao tu tu do cua toi cho dip ${occasionLabel}${occasion === 'celeb' ? ` theo phong cach ${selectedCeleb}` : ''}. Toi muon moi set co vibe rieng, ton dang ${bodyShapeLabel}, hop da ${skinToneLabel}. Dung de xuat do moi, chi dung nhung gi toi co.` },
        ],
        schema: z.object({
          outfits: z.array(z.object({
            itemIndices: z.array(z.number()).describe('Indices cua cac mon do trong tu duoc chon cho outfit nay'),
            description: z.string().describe('Mo ta ngan outfit bang tieng Viet - ten do + mood/vibe (VD: "Ao so mi xanh + Short kaki + Giay da nau - Casual chic di bien")'),
            reasoning: z.string().describe('Giai thich chi tiet bang tieng Viet: tai sao hop dang, phoi mau the nao, phu hop dip ra sao, visual fit tren nguoi nhu nao'),
          })).min(4).max(6),
        }),
      });

      const suggestions: OutfitSuggestion[] = result.outfits.map((outfit, idx) => {
        const outfitItems = outfit.itemIndices
          .filter(i => i >= 0 && i < items.length)
          .map(i => items[i]);

        return {
          id: Date.now().toString() + '-' + idx,
          items: outfitItems,
          description: outfit.description,
          reasoning: outfit.reasoning,
          occasion,
          celebName: occasion === 'celeb' ? selectedCeleb : undefined,
          createdAt: new Date().toISOString(),
          isFavorite: false,
          isGeneratingImage: !!profile.fullBodyPhotoUri,
          originalPhotoUri: profile.fullBodyPhotoUri,
        };
      }).filter(s => s.items.length >= 2);

      console.log('[MixDo] Generated', suggestions.length, 'unique outfits');

      return suggestions;
    },
  });

  const handleGenerate = useCallback(() => {
    if (items.length < 2) {
      Alert.alert(
        'Chua du do',
        'Ban can them it nhat 2 mon do vao tu de AI co the mix outfit.',
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    generateMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data && data.length > 0) {
          setGeneratedOutfits(data);
          addOutfits(data);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log('[MixDo] Generation complete -', data.length, 'outfits');

          if (profile.fullBodyPhotoUri) {
            console.log('[MixDo] Starting try-on image generation for all outfits...');
            data.forEach((outfit) => {
              generateTryOnImage(outfit);
            });
          }
        } else {
          Alert.alert('Hmm', 'AI khong tao duoc outfit phu hop. Thu lai nhe!');
        }
      },
      onError: (error) => {
        console.error('[MixDo] Generate error:', error);
        if ((error as Error).message === 'NOT_ENOUGH_ITEMS') {
          Alert.alert('Chua du do', 'Them it nhat 2 mon vao tu.');
        } else {
          Alert.alert('Loi', 'Khong the tao outfit. Vui long thu lai.');
        }
      },
    });
  }, [items, profile, occasion, selectedCeleb, generateMutation, addOutfits, buttonScale, generateTryOnImage]);

  const handleRetryTryOn = useCallback((outfit: OutfitSuggestion) => {
    generateTryOnImage(outfit);
  }, [generateTryOnImage]);

  const isGenerating = generateMutation.isPending;
  const styles = makeStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🎯 Chon dip</Text>
        <View style={styles.occasionGrid}>
          {OCCASION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.occasionChip, occasion === opt.value && styles.occasionChipActive]}
              onPress={() => {
                setOccasion(opt.value);
                Haptics.selectionAsync();
              }}
              testID={`occasion-${opt.value}`}
            >
              <Text style={styles.occasionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.occasionLabel, occasion === opt.value && styles.occasionLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {occasion === 'celeb' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⭐ Chon Celeb/KOL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.celebScroll}>
            <View style={styles.celebRow}>
              {CELEB_LIST.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.celebChip, selectedCeleb === name && styles.celebChipActive]}
                  onPress={() => {
                    setSelectedCeleb(name);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.celebText, selectedCeleb === name && styles.celebTextActive]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {profile.fullBodyPhotoUri ? (
        <View style={styles.tryOnBanner}>
          <UserCheck size={18} color={colors.success} />
          <View style={styles.tryOnBannerContent}>
            <Text style={styles.tryOnBannerTitle}>Thu do AI san sang</Text>
            <Text style={styles.tryOnBannerSub}>AI se chinh sua anh ban, chi thay do - giu nguyen mat, dang, phong nen 100%</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noPhotoBanner}>
          <ImageOff size={18} color={colors.textTertiary} />
          <View style={styles.tryOnBannerContent}>
            <Text style={styles.noPhotoBannerTitle}>Chua co anh toan than</Text>
            <Text style={styles.noPhotoBannerSub}>Tai anh o tab Tu do de AI thu do thuc te len nguoi ban</Text>
          </View>
        </View>
      )}

      {items.length < 2 && (
        <View style={styles.warningCard}>
          <AlertCircle size={18} color={colors.error} />
          <Text style={styles.warningText}>
            Them it nhat 2 mon do vao tu de bat dau mix outfit
          </Text>
        </View>
      )}

      <View style={styles.profilePreview}>
        <Text style={styles.profilePreviewText}>
          {genderLabel} • {profile.age}t • {profile.height}cm/{profile.weight}kg • {bodyShapeLabel} • Da {skinToneLabel}
        </Text>
        <Text style={styles.profilePreviewSub}>
          {items.length} mon do trong tu
        </Text>
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
          activeOpacity={0.85}
          testID="generate-btn"
        >
          {isGenerating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.generateText}>
                AI dang mix do cho ban...
              </Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Wand2 size={22} color="#FFFFFF" />
              <Text style={styles.generateText}>Mix cho tui!</Text>
              <Sparkles size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {generatedOutfits.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>✨ Goi y cho ban</Text>
          {profile.fullBodyPhotoUri && (
            <Text style={styles.resultsHint}>AI dang tao anh thu do thuc te - giu nguyen mat, dang, phong nen cua ban</Text>
          )}
          {generatedOutfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onFeedback={setFeedback}
              onToggleFavorite={toggleFavorite}
              onRetryTryOn={handleRetryTryOn}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 12,
    },
    occasionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    occasionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    occasionChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    occasionEmoji: {
      fontSize: 16,
    },
    occasionLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    occasionLabelActive: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    celebScroll: {
      marginHorizontal: -8,
    },
    celebRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 8,
    },
    celebChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    celebChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    celebText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    celebTextActive: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    tryOnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(91, 160, 122, 0.08)',
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(91, 160, 122, 0.2)',
    },
    tryOnBannerContent: {
      flex: 1,
    },
    tryOnBannerTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.success,
    },
    tryOnBannerSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    noPhotoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    noPhotoBannerTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    noPhotoBannerSub: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(217, 79, 79, 0.08)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: colors.error,
    },
    profilePreview: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
      alignItems: 'center',
    },
    profilePreviewText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    profilePreviewSub: {
      fontSize: 11,
      color: colors.textTertiary,
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
