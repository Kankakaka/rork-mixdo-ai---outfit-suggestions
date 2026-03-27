import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, ImagePlus, Shirt, User, ChevronDown, ChevronUp, UserCheck, Trash2, ZoomIn, X } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { useTheme } from '@/hooks/useTheme';
import { useWardrobe } from '@/contexts/WardrobeContext';
import { useProfile } from '@/contexts/ProfileContext';
import WardrobeItemCard from '@/components/WardrobeItemCard';
import { WardrobeItem, ClothingCategory } from '@/types';
import { CATEGORY_LABELS, CATEGORY_EMOJI, BODY_SHAPE_LABELS, SKIN_TONE_LABELS } from '@/constants/data';

const categoryFilters: (ClothingCategory | 'all')[] = ['all', 'top', 'bottom', 'shoes', 'outerwear', 'accessory'];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { items, addItem, addItems, removeItem, categoryCounts, totalItems } = useWardrobe();
  const { profile, setFullBodyPhoto } = useProfile();
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | 'all'>('all');
  const [showProfile, setShowProfile] = useState(false);
  const [showBodyPhotoZoom, setShowBodyPhotoZoom] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; failed: number } | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(i => i.category === selectedCategory);

  const convertToBase64 = useCallback(async (imageUri: string): Promise<string> => {
    if (imageUri.startsWith('data:')) return imageUri;
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } else {
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    }
  }, []);

  const analyzeOneImage = useCallback(async (imageUri: string) => {
    const base64Image = await convertToBase64(imageUri);
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this clothing item photo. Return the category, a Vietnamese label (descriptive name like "Áo sơ mi trắng" or "Quần jeans xanh"), and the main color in Vietnamese. Be specific and concise.',
            },
            {
              type: 'image',
              image: base64Image,
            },
          ],
        },
      ],
      schema: z.object({
        category: z.enum(['top', 'bottom', 'shoes', 'accessory', 'outerwear']).describe('Clothing category'),
        label: z.string().describe('Vietnamese descriptive label for the item'),
        color: z.string().describe('Main color in Vietnamese'),
      }),
    });
    return { ...result, imageUri };
  }, [convertToBase64]);

  const analyzeMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      return analyzeOneImage(imageUri);
    },
  });

  const batchAnalyzeMutation = useMutation({
    mutationFn: async (imageUris: string[]) => {
      const total = imageUris.length;
      let done = 0;
      let failed = 0;
      const successItems: WardrobeItem[] = [];
      const failedUris: string[] = [];

      setBatchProgress({ total, done: 0, failed: 0 });
      progressAnim.setValue(0);

      const promises = imageUris.map(async (uri) => {
        try {
          console.log('[MixDo] Batch analyzing:', uri.substring(0, 50));
          const data = await analyzeOneImage(uri);
          const newItem: WardrobeItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            imageUri: data.imageUri,
            category: data.category,
            label: data.label,
            color: data.color,
            addedAt: new Date().toISOString(),
          };
          successItems.push(newItem);
          done++;
          console.log(`[MixDo] Batch item analyzed (${done}/${total}):`, data.label);
        } catch (error) {
          failed++;
          failedUris.push(uri);
          console.error('[MixDo] Batch analysis failed for:', uri.substring(0, 50), error);
        }
        setBatchProgress({ total, done: done, failed });
        Animated.timing(progressAnim, {
          toValue: (done + failed) / total,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });

      await Promise.all(promises);
      return { successItems, failedUris, total, done, failed };
    },
    onSuccess: (data) => {
      if (data.successItems.length > 0) {
        addItems(data.successItems);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (data.failed > 0) {
        Alert.alert(
          'Kết quả tải lên',
          `Thành công: ${data.done} ảnh\nLỗi: ${data.failed} ảnh không thể phân tích`,
        );
      } else {
        Alert.alert('Thành công', `Đã thêm ${data.done} món đồ vào tủ!`);
      }
      setTimeout(() => setBatchProgress(null), 800);
    },
    onError: (error) => {
      console.error('[MixDo] Batch error:', error);
      Alert.alert('Lỗi', 'Không thể phân tích ảnh. Vui lòng thử lại.');
      setBatchProgress(null);
    },
  });

  const handlePickImage = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập camera để chụp ảnh quần áo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
        });
        if (!result.canceled && result.assets[0]) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const uri = result.assets[0].uri;
          console.log('[MixDo] Camera: analyzing image:', uri.substring(0, 50));
          analyzeMutation.mutate(uri, {
            onSuccess: (data) => {
              const newItem: WardrobeItem = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
                imageUri: data.imageUri,
                category: data.category,
                label: data.label,
                color: data.color,
                addedAt: new Date().toISOString(),
              };
              addItem(newItem);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              console.log('[MixDo] Item added:', newItem.label);
            },
            onError: (error) => {
              console.error('[MixDo] Analysis error:', error);
              Alert.alert('Lỗi phân tích', 'Không thể phân tích ảnh. Vui lòng thử lại.');
            },
          });
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 10,
        });
        if (!result.canceled && result.assets.length > 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const uris = result.assets.map(a => a.uri);
          console.log(`[MixDo] Gallery: ${uris.length} images selected`);
          if (uris.length === 1) {
            analyzeMutation.mutate(uris[0], {
              onSuccess: (data) => {
                const newItem: WardrobeItem = {
                  id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
                  imageUri: data.imageUri,
                  category: data.category,
                  label: data.label,
                  color: data.color,
                  addedAt: new Date().toISOString(),
                };
                addItem(newItem);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                console.log('[MixDo] Item added:', newItem.label);
              },
              onError: (error) => {
                console.error('[MixDo] Analysis error:', error);
                Alert.alert('Lỗi phân tích', 'Không thể phân tích ảnh. Vui lòng thử lại.');
              },
            });
          } else {
            batchAnalyzeMutation.mutate(uris);
          }
        }
      }
    } catch (error) {
      console.error('[MixDo] Image pick error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  }, [analyzeMutation, batchAnalyzeMutation, addItem, addItems]);

  const handlePickFullBodyPhoto = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập camera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [3, 4],
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [3, 4],
        });
      }

      if (!result.canceled && result.assets[0]) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFullBodyPhoto(result.assets[0].uri);
        console.log('[MixDo] Full body photo saved');
      }
    } catch (error) {
      console.error('[MixDo] Full body photo error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  }, [setFullBodyPhoto]);

  const showFullBodyMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Ảnh toàn thân',
      'Tải ảnh toàn thân để thử đồ ảo chính xác — giữ nguyên mặt, dáng, phông nền',
      [
        { text: 'Chụp ảnh', onPress: () => handlePickFullBodyPhoto('camera') },
        { text: 'Chọn từ thư viện', onPress: () => handlePickFullBodyPhoto('gallery') },
        ...(profile.fullBodyPhotoUri ? [{ text: 'Xoá ảnh', style: 'destructive' as const, onPress: () => {
          setFullBodyPhoto(undefined);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}] : []),
        { text: 'Hủy', style: 'cancel' as const },
      ]
    );
  };



  const genderLabel = profile.gender === 'nam' ? 'Nam' : profile.gender === 'nu' ? 'Nữ' : 'Khác';
  const styles = makeStyles(colors);

  const renderHeader = () => (
    <View>
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => setShowProfile(!showProfile)}
        activeOpacity={0.8}
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <User size={20} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{genderLabel} • {profile.age} tuổi</Text>
            <Text style={styles.profileDetails}>
              {profile.height}cm • {profile.weight}kg • {BODY_SHAPE_LABELS[profile.bodyShape]}
            </Text>
          </View>
          {showProfile ? (
            <ChevronUp size={18} color={colors.textTertiary} />
          ) : (
            <ChevronDown size={18} color={colors.textTertiary} />
          )}
        </View>
        {showProfile && (
          <View style={styles.profileExpanded}>
            <View style={styles.profileStat}>
              <Text style={styles.statLabel}>Dáng người</Text>
              <Text style={styles.statValue}>{BODY_SHAPE_LABELS[profile.bodyShape]}</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.statLabel}>Tông da</Text>
              <Text style={styles.statValue}>{SKIN_TONE_LABELS[profile.skinTone]}</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.statLabel}>Tủ đồ</Text>
              <Text style={styles.statValue}>{totalItems} món</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.bodyPhotoSection}>
        <View style={styles.bodyPhotoHeader}>
          <UserCheck size={18} color={colors.primary} />
          <Text style={styles.bodyPhotoTitle}>Ảnh toàn thân</Text>
          {profile.fullBodyPhotoUri && (
            <View style={styles.bodyPhotoBadge}>
              <Text style={styles.bodyPhotoBadgeText}>✓ Đã tải</Text>
            </View>
          )}
        </View>
        <Text style={styles.bodyPhotoHint}>
          Tải ảnh toàn thân để thử đồ ảo chính xác — giữ nguyên mặt, dáng, phông nền
        </Text>

        {profile.fullBodyPhotoUri ? (
          <View style={styles.bodyPhotoPreviewRow}>
            <TouchableOpacity
              style={styles.bodyPhotoPreview}
              onPress={() => setShowBodyPhotoZoom(true)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: profile.fullBodyPhotoUri }}
                style={styles.bodyPhotoImage}
                contentFit="cover"
              />
              <View style={styles.bodyPhotoOverlay}>
                <ZoomIn size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.bodyPhotoActions}>
              <TouchableOpacity style={styles.bodyPhotoChangeBtn} onPress={showFullBodyMenu}>
                <Camera size={16} color={colors.primary} />
                <Text style={styles.bodyPhotoChangeText}>Đổi ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bodyPhotoDeleteBtn}
                onPress={() => {
                  Alert.alert('Xoá ảnh?', 'Bạn có muốn xoá ảnh toàn thân không?', [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Xoá', style: 'destructive', onPress: () => {
                      setFullBodyPhoto(undefined);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }},
                  ]);
                }}
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.bodyPhotoChangeText, { color: colors.error }]}>Xoá</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.bodyPhotoUploadBtn} onPress={showFullBodyMenu} activeOpacity={0.8}>
            <View style={styles.bodyPhotoUploadInner}>
              <ImagePlus size={28} color={colors.primary} />
              <Text style={styles.bodyPhotoUploadText}>Tải ảnh toàn thân</Text>
              <Text style={styles.bodyPhotoUploadSub}>AI giữ nguyên mặt, dáng, phông nền — chỉ đổi quần áo</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {analyzeMutation.isPending && !batchProgress && (
        <View style={styles.analyzeBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.analyzeText}>AI đang phân tích quần áo...</Text>
        </View>
      )}

      {batchProgress && (
        <View style={styles.batchBar}>
          <View style={styles.batchHeader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.batchTitle}>
              Đang phân tích {batchProgress.done + batchProgress.failed}/{batchProgress.total} ảnh...
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.batchStats}>
            <Text style={styles.batchStatText}>✓ {batchProgress.done} thành công</Text>
            {batchProgress.failed > 0 && (
              <Text style={[styles.batchStatText, { color: colors.error }]}>✗ {batchProgress.failed} lỗi</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.filterRow}>
        {categoryFilters.map((cat) => {
          const isActive = selectedCategory === cat;
          const label = cat === 'all' ? 'Tất cả' : CATEGORY_EMOJI[cat] + ' ' + CATEGORY_LABELS[cat];
          const count = cat === 'all' ? totalItems : (categoryCounts[cat] || 0);
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => {
                setSelectedCategory(cat);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {label} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.addButtonRow}>
        <TouchableOpacity
          style={[styles.addButton, styles.addButtonCamera]}
          onPress={() => handlePickImage('camera')}
          activeOpacity={0.8}
          testID="add-item-camera-btn"
          disabled={batchAnalyzeMutation.isPending}
        >
          <Camera size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Chụp ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, styles.addButtonGallery]}
          onPress={() => handlePickImage('gallery')}
          activeOpacity={0.8}
          testID="add-item-gallery-btn"
          disabled={batchAnalyzeMutation.isPending}
        >
          <ImagePlus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Chọn nhiều ảnh</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.uploadTip}>💡 Upload đồ trên nền trắng để overlay tốt hơn</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Shirt size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>Tủ đồ trống</Text>
      <Text style={styles.emptySubtitle}>Chụp hoặc chọn ảnh quần áo để bắt đầu</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <WardrobeItemCard item={item} onDelete={removeItem} />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showBodyPhotoZoom}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBodyPhotoZoom(false)}
      >
        <View style={styles.zoomModal}>
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setShowBodyPhotoZoom(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {profile.fullBodyPhotoUri && (
            <Image
              source={{ uri: profile.fullBodyPhotoUri }}
              style={styles.zoomImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInfo: {
      flex: 1,
      marginLeft: 12,
    },
    profileName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    profileDetails: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    profileExpanded: {
      flexDirection: 'row',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: 12,
    },
    profileStat: {
      flex: 1,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text,
    },
    bodyPhotoSection: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    bodyPhotoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    bodyPhotoTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
    bodyPhotoBadge: {
      backgroundColor: 'rgba(91, 160, 122, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    bodyPhotoBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.success,
    },
    bodyPhotoHint: {
      fontSize: 12,
      color: colors.textTertiary,
      marginBottom: 12,
      marginLeft: 26,
    },
    bodyPhotoPreviewRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    bodyPhotoPreview: {
      width: 90,
      height: 120,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    bodyPhotoImage: {
      width: '100%',
      height: '100%',
    },
    bodyPhotoOverlay: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 8,
      padding: 4,
    },
    bodyPhotoActions: {
      flex: 1,
      gap: 8,
      justifyContent: 'center',
    },
    bodyPhotoChangeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primarySoft,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    bodyPhotoDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(217, 79, 79, 0.08)',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    bodyPhotoChangeText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.primary,
    },
    bodyPhotoUploadBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 14,
      overflow: 'hidden',
    },
    bodyPhotoUploadInner: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 6,
    },
    bodyPhotoUploadText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    bodyPhotoUploadSub: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    analyzeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primarySoft,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    analyzeText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    filterChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    addButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    addButton: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    addButtonCamera: {
      backgroundColor: colors.primary,
    },
    addButtonGallery: {
      backgroundColor: colors.accent || colors.primary,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    uploadTip: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center' as const,
      marginTop: 6,
    },
    batchBar: {
      backgroundColor: colors.primarySoft,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    batchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    batchTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.borderLight,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    batchStats: {
      flexDirection: 'row',
      gap: 12,
    },
    batchStatText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.success,
    },
    gridRow: {
      gap: 10,
      marginBottom: 10,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center' as const,
    },
    zoomModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    zoomCloseBtn: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 20,
      padding: 8,
    },
    zoomImage: {
      width: '90%',
      height: '75%',
    },
  });
