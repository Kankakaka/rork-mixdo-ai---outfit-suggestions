import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { WardrobeItem } from '@/types';
import { CATEGORY_EMOJI } from '@/constants/data';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  item: WardrobeItem;
  onDelete: (id: string) => void;
}

function WardrobeItemCard({ item, onDelete }: Props) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Xóa đồ',
      `Bạn muốn xóa "${item.label}" khỏi tủ đồ?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => onDelete(item.id) },
      ]
    );
  };

  const styles = makeStyles(colors);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleDelete}
        testID={`wardrobe-item-${item.id}`}
      >
        <Image
          source={{ uri: item.imageUri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.info}>
          <Text style={styles.emoji}>{CATEGORY_EMOJI[item.category]}</Text>
          <Text style={styles.label} numberOfLines={2}>{item.label}</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} testID={`delete-${item.id}`}>
          <Trash2 size={14} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(WardrobeItemCard);

const makeStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    image: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: colors.surfaceAlt,
    },
    info: {
      padding: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    emoji: {
      fontSize: 14,
      marginTop: 1,
    },
    label: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.text,
      lineHeight: 16,
    },
    deleteBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
  });
