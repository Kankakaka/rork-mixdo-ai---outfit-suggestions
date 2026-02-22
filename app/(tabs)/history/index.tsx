import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Clock, Heart, Filter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useOutfits } from '@/contexts/OutfitContext';
import OutfitCard from '@/components/OutfitCard';
import { OutfitSuggestion } from '@/types';

type FilterType = 'all' | 'favorites' | 'good' | 'bad' | 'no_feedback';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { outfits, setFeedback, toggleFavorite } = useOutfits();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredOutfits = useMemo(() => {
    switch (filter) {
      case 'favorites':
        return outfits.filter(o => o.isFavorite);
      case 'good':
        return outfits.filter(o => o.feedback === 'good');
      case 'bad':
        return outfits.filter(o => o.feedback === 'bad');
      case 'no_feedback':
        return outfits.filter(o => !o.feedback);
      default:
        return outfits;
    }
  }, [outfits, filter]);

  const filters: { key: FilterType; label: string; icon?: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'favorites', label: '❤️ Yêu thích' },
    { key: 'good', label: '👍 Đẹp' },
    { key: 'bad', label: '👎 Chưa ổn' },
    { key: 'no_feedback', label: '💬 Chưa đánh giá' },
  ];

  const styles = makeStyles(colors);

  const renderHeader = () => (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Clock size={18} color={colors.primary} />
          <Text style={styles.statNumber}>{outfits.length}</Text>
          <Text style={styles.statLabel}>Outfit đã tạo</Text>
        </View>
        <View style={styles.statCard}>
          <Heart size={18} color="#E8636B" />
          <Text style={styles.statNumber}>{outfits.filter(o => o.isFavorite).length}</Text>
          <Text style={styles.statLabel}>Yêu thích</Text>
        </View>
        <View style={styles.statCard}>
          <Filter size={18} color={colors.accent} />
          <Text style={styles.statNumber}>{outfits.filter(o => o.feedback).length}</Text>
          <Text style={styles.statLabel}>Đã đánh giá</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => {
              setFilter(f.key);
              Haptics.selectionAsync();
            }}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Clock size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {filter === 'all' ? 'Chưa có outfit nào' : 'Không có kết quả'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Vào tab "Mix đồ" để tạo outfit đầu tiên!'
          : 'Thử bộ lọc khác nhé'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOutfits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <OutfitCard
            outfit={item}
            onFeedback={setFeedback}
            onToggleFavorite={toggleFavorite}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
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
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
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
  });
