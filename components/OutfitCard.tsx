import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Heart, ThumbsUp, ThumbsDown, MessageCircle, X, ZoomIn, Shirt, Camera, Share2, RefreshCw, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import { OutfitSuggestion, WardrobeItem } from '@/types';
import { CATEGORY_EMOJI } from '@/constants/data';
import { useTheme } from '@/hooks/useTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16;
const COLLAGE_WIDTH = SCREEN_WIDTH - 32 - (CARD_PADDING * 2);
const SIDE_BY_SIDE_WIDTH = (COLLAGE_WIDTH - 8) / 2;

interface Props {
  outfit: OutfitSuggestion;
  onFeedback: (id: string, feedback: 'good' | 'bad', note?: string) => void;
  onToggleFavorite: (id: string) => void;
  onRetryTryOn?: (outfit: OutfitSuggestion) => void;
  showFeedback?: boolean;
}

function OutfitCard({ outfit, onFeedback, onToggleFavorite, onRetryTryOn, showFeedback = true }: Props) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [pendingFeedback, setPendingFeedback] = useState<'good' | 'bad' | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string>('');
  const viewShotRef = useRef<ViewShot>(null);

  const hasOriginal = !!outfit.originalPhotoUri;
  const hasTryOn = !!outfit.generatedImageUri;
  const isGeneratingImage = !!outfit.isGeneratingImage;

  const handleFeedback = (type: 'good' | 'bad') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingFeedback(type);
    setShowNoteInput(true);
  };

  const submitFeedback = () => {
    if (pendingFeedback) {
      onFeedback(outfit.id, pendingFeedback, feedbackNote || undefined);
      setShowNoteInput(false);
      setFeedbackNote('');
      setPendingFeedback(null);
    }
  };

  const handleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onToggleFavorite(outfit.id);
  };

  const openZoom = (uri: string) => {
    setZoomImageUri(uri);
    setShowZoom(true);
  };

  const handleRetry = useCallback(() => {
    if (onRetryTryOn) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRetryTryOn(outfit);
    }
  }, [onRetryTryOn, outfit]);

  const styles = makeStyles(colors);

  const SIDE_HEIGHT = SIDE_BY_SIDE_WIDTH * 1.4;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.occasionBadge}>
          <Text style={styles.occasionText}>
            {outfit.celebName ? `⭐ ${outfit.celebName}` : outfit.occasion}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity onPress={handleFavorite} testID={`fav-${outfit.id}`}>
            <Heart
              size={22}
              color={outfit.isFavorite ? '#E8636B' : colors.textTertiary}
              fill={outfit.isFavorite ? '#E8636B' : 'transparent'}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {hasOriginal && (hasTryOn || isGeneratingImage) ? (
        <View style={styles.tryOnSection}>
          <View style={styles.tryOnHeader}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.tryOnTitle}>Thu do AI</Text>
            {hasTryOn && (
              <Text style={styles.tryOnSubtitle}>Giu nguyen mat, dang, phong nen</Text>
            )}
          </View>

          {(Platform.OS as string) !== 'web' ? (
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.92 } as any}
              style={styles.viewShotWrapper}
            >
              <View style={styles.sideBySideContainer}>
                <View style={styles.sideImageWrapper}>
                  <Image
                    source={{ uri: outfit.originalPhotoUri }}
                    style={[styles.sideImage, { height: SIDE_HEIGHT }]}
                    contentFit="cover"
                  />
                  <View style={styles.imageLabel}>
                    <Text style={styles.imageLabelText}>Anh goc</Text>
                  </View>
                </View>

                <View style={styles.sideImageWrapper}>
                  {isGeneratingImage && !hasTryOn ? (
                    <View style={[styles.generatingPlaceholder, { height: SIDE_HEIGHT }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.generatingText}>AI dang thu do...</Text>
                      <Text style={styles.generatingSubtext}>Giu nguyen mat & phong nen</Text>
                    </View>
                  ) : hasTryOn ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openZoom(outfit.generatedImageUri!)}
                    >
                      <Image
                        source={{ uri: outfit.generatedImageUri }}
                        style={[styles.sideImage, { height: SIDE_HEIGHT }]}
                        contentFit="cover"
                      />
                      <View style={[styles.imageLabel, styles.tryOnLabel]}>
                        <Text style={styles.imageLabelText}>Thu do</Text>
                      </View>
                      <View style={styles.zoomHint}>
                        <ZoomIn size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </ViewShot>
          ) : (
            <View style={styles.sideBySideContainer}>
              <View style={styles.sideImageWrapper}>
                <Image
                  source={{ uri: outfit.originalPhotoUri }}
                  style={[styles.sideImage, { height: SIDE_HEIGHT }]}
                  contentFit="cover"
                />
                <View style={styles.imageLabel}>
                  <Text style={styles.imageLabelText}>Anh goc</Text>
                </View>
              </View>

              <View style={styles.sideImageWrapper}>
                {isGeneratingImage && !hasTryOn ? (
                  <View style={[styles.generatingPlaceholder, { height: SIDE_HEIGHT }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.generatingText}>AI dang thu do...</Text>
                    <Text style={styles.generatingSubtext}>Giu nguyen mat & phong nen</Text>
                  </View>
                ) : hasTryOn ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openZoom(outfit.generatedImageUri!)}
                  >
                    <Image
                      source={{ uri: outfit.generatedImageUri }}
                      style={[styles.sideImage, { height: SIDE_HEIGHT }]}
                      contentFit="cover"
                    />
                    <View style={[styles.imageLabel, styles.tryOnLabel]}>
                      <Text style={styles.imageLabelText}>Thu do</Text>
                    </View>
                    <View style={styles.zoomHint}>
                      <ZoomIn size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          <View style={styles.tryOnActions}>
            <View style={styles.tryOnItemsRow}>
              {outfit.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id + '-thumb-' + idx}
                  style={styles.miniThumb}
                  onPress={() => openZoom(item.croppedUri || item.imageUri)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.miniThumbImg}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
              <Text style={styles.tryOnItemCount}>{outfit.items.length} mon</Text>
            </View>

            <View style={styles.tryOnBtnRow}>
              {hasOriginal && !isGeneratingImage && onRetryTryOn && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={13} color={colors.primary} />
                  <Text style={styles.retryBtnText}>Thu lai</Text>
                </TouchableOpacity>
              )}
              {hasOriginal && (
                <TouchableOpacity
                  style={styles.viewOriginalBtn}
                  onPress={() => openZoom(outfit.originalPhotoUri!)}
                  activeOpacity={0.85}
                >
                  <ZoomIn size={13} color={colors.textSecondary} />
                  <Text style={styles.viewOriginalText}>Xem goc</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : hasOriginal && !isGeneratingImage && !hasTryOn ? (
        <View style={styles.tryOnSection}>
          <View style={styles.tryOnHeader}>
            <Shirt size={14} color={colors.primary} />
            <Text style={styles.tryOnTitle}>Do goi y</Text>
          </View>
          <View style={styles.itemsRow}>
            {outfit.items.map((item, idx) => (
              <TouchableOpacity
                key={item.id + '-' + idx}
                style={styles.itemThumb}
                onPress={() => openZoom(item.croppedUri || item.imageUri)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: item.imageUri }} style={styles.thumbImage} contentFit="cover" />
                <Text style={styles.thumbLabel} numberOfLines={1}>
                  {CATEGORY_EMOJI[item.category]} {item.label.split(' ').slice(0, 2).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {onRetryTryOn && (
            <TouchableOpacity
              style={styles.generateTryOnBtn}
              onPress={handleRetry}
              activeOpacity={0.85}
            >
              <Sparkles size={14} color="#FFFFFF" />
              <Text style={styles.generateTryOnText}>Tao anh thu do AI</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.viewOriginalBtn}
            onPress={() => openZoom(outfit.originalPhotoUri!)}
            activeOpacity={0.85}
          >
            <ZoomIn size={13} color={colors.textSecondary} />
            <Text style={styles.viewOriginalText}>Xem anh goc</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.itemsRow}>
          {outfit.items.map((item, idx) => (
            <TouchableOpacity
              key={item.id + '-' + idx}
              style={styles.itemThumb}
              onPress={() => openZoom(item.croppedUri || item.imageUri)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: item.imageUri }} style={styles.thumbImage} contentFit="cover" />
              <Text style={styles.thumbLabel} numberOfLines={1}>
                {CATEGORY_EMOJI[item.category]} {item.label.split(' ').slice(0, 2).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!hasOriginal && outfit.items.length > 0 && (
        <View style={styles.noOverlayNote}>
          <Text style={styles.noOverlayText}>Tai anh toan than de AI thu do thuc te len nguoi ban</Text>
        </View>
      )}

      <Text style={styles.description}>{outfit.description}</Text>
      <Text style={styles.reasoning}>{outfit.reasoning}</Text>

      {showFeedback && !outfit.feedback && (
        <View>
          {!showNoteInput ? (
            <View style={styles.feedbackRow}>
              <TouchableOpacity
                style={[styles.feedbackBtn, styles.goodBtn]}
                onPress={() => handleFeedback('good')}
                testID={`good-${outfit.id}`}
              >
                <ThumbsUp size={16} color={colors.success} />
                <Text style={[styles.feedbackText, { color: colors.success }]}>Dep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackBtn, styles.badBtn]}
                onPress={() => handleFeedback('bad')}
                testID={`bad-${outfit.id}`}
              >
                <ThumbsDown size={16} color={colors.error} />
                <Text style={[styles.feedbackText, { color: colors.error }]}>Chua on</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noteContainer}>
              <View style={styles.noteHeader}>
                <MessageCircle size={14} color={colors.textSecondary} />
                <Text style={styles.noteLabel}>Ly do (tuy chon):</Text>
                <TouchableOpacity onPress={() => { setShowNoteInput(false); setPendingFeedback(null); }}>
                  <X size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.noteInput}
                value={feedbackNote}
                onChangeText={setFeedbackNote}
                placeholder="VD: Mau clash, Khong hop body..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <TouchableOpacity style={styles.submitBtn} onPress={submitFeedback}>
                <Text style={styles.submitText}>Gui</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {outfit.feedback && (
        <View style={[styles.feedbackDone, outfit.feedback === 'good' ? styles.goodDone : styles.badDone]}>
          <Text style={styles.feedbackDoneText}>
            {outfit.feedback === 'good' ? '👍 Ban thich set nay' : '👎 Chua on'}
            {outfit.feedbackNote ? ` — "${outfit.feedbackNote}"` : ''}
          </Text>
        </View>
      )}

      <Modal
        visible={showZoom}
        transparent
        animationType="fade"
        onRequestClose={() => setShowZoom(false)}
      >
        <View style={styles.zoomModal}>
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setShowZoom(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {zoomImageUri ? (
            <Image
              source={{ uri: zoomImageUri }}
              style={styles.zoomImage}
              contentFit="contain"
            />
          ) : null}

          <View style={styles.zoomCaption}>
            <Text style={styles.zoomCaptionText} numberOfLines={2}>{outfit.description}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default React.memo(OutfitCard);

const makeStyles = (colors: any) => {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: CARD_PADDING,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    occasionBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
    },
    occasionText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    tryOnSection: {
      marginBottom: 12,
    },
    tryOnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    tryOnTitle: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    tryOnSubtitle: {
      fontSize: 11,
      color: colors.textTertiary,
      marginLeft: 4,
    },
    viewShotWrapper: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    sideBySideContainer: {
      flexDirection: 'row',
      gap: 8,
      borderRadius: 16,
      overflow: 'hidden',
    },
    sideImageWrapper: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
    },
    sideImage: {
      width: '100%',
      borderRadius: 14,
    },
    imageLabel: {
      position: 'absolute' as const,
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    tryOnLabel: {
      backgroundColor: 'rgba(76, 140, 200, 0.85)',
    },
    imageLabelText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    zoomHint: {
      position: 'absolute' as const,
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      padding: 6,
    },
    generatingPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      gap: 8,
    },
    generatingText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.primary,
      textAlign: 'center' as const,
    },
    generatingSubtext: {
      fontSize: 10,
      color: colors.textTertiary,
      textAlign: 'center' as const,
    },
    tryOnActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    tryOnItemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    tryOnItemCount: {
      fontSize: 11,
      color: colors.textTertiary,
      marginLeft: 2,
    },
    tryOnBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    retryBtnText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    viewOriginalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    viewOriginalText: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    generateTryOnBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 8,
    },
    generateTryOnText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    miniThumb: {
      width: 26,
      height: 26,
      borderRadius: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    miniThumbImg: {
      width: '100%',
      height: '100%',
    },
    itemsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    itemThumb: {
      flex: 1,
      alignItems: 'center',
    },
    thumbImage: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
    },
    thumbLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center' as const,
    },
    noOverlayNote: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
    },
    noOverlayText: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center' as const,
    },
    description: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 6,
    },
    reasoning: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 12,
    },
    feedbackRow: {
      flexDirection: 'row',
      gap: 10,
    },
    feedbackBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    goodBtn: {
      borderColor: colors.success,
      backgroundColor: colors.surface,
    },
    badBtn: {
      borderColor: colors.error,
      backgroundColor: colors.surface,
    },
    feedbackText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    noteContainer: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 12,
    },
    noteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    noteLabel: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    noteInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 10,
      fontSize: 13,
      color: colors.text,
      minHeight: 40,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    submitText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    feedbackDone: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    goodDone: {
      backgroundColor: 'rgba(91, 160, 122, 0.1)',
    },
    badDone: {
      backgroundColor: 'rgba(217, 79, 79, 0.1)',
    },
    feedbackDoneText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    zoomModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    zoomCloseBtn: {
      position: 'absolute' as const,
      top: 60,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 20,
      padding: 8,
    },
    zoomImage: {
      width: '92%',
      height: '72%',
    },
    zoomCaption: {
      position: 'absolute' as const,
      bottom: 60,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      padding: 12,
    },
    zoomCaptionText: {
      fontSize: 14,
      color: '#FFFFFF',
      textAlign: 'center' as const,
      lineHeight: 20,
    },
  });
};
