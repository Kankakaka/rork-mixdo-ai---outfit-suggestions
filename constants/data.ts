import { BodyShape, SkinTone, Occasion, ClothingCategory } from '@/types';

export const GENDER_OPTIONS = [
  { value: 'nam' as const, label: 'Nam' },
  { value: 'nu' as const, label: 'Nữ' },
  { value: 'khac' as const, label: 'Khác' },
];

export const BODY_SHAPE_OPTIONS: { value: BodyShape; label: string }[] = [
  { value: 'hourglass', label: 'Đồng hồ cát (Hourglass)' },
  { value: 'pear', label: 'Quả lê (Pear)' },
  { value: 'apple', label: 'Quả táo (Apple)' },
  { value: 'rectangle', label: 'Hình chữ nhật (Rectangle)' },
  { value: 'inverted_triangle', label: 'Tam giác ngược (Inverted Triangle)' },
  { value: 'athletic', label: 'Thể thao (Athletic)' },
];

export const SKIN_TONE_OPTIONS: { value: SkinTone; label: string }[] = [
  { value: 'fair', label: 'Trắng (Fair)' },
  { value: 'medium', label: 'Vàng (Medium)' },
  { value: 'tan', label: 'Ngăm (Tan)' },
  { value: 'dark', label: 'Đen (Dark)' },
];

export const OCCASION_OPTIONS: { value: Occasion; label: string; emoji: string }[] = [
  { value: 'travel', label: 'Du lịch', emoji: '✈️' },
  { value: 'party', label: 'Đám tiệc', emoji: '🎉' },
  { value: 'date', label: 'Hẹn hò', emoji: '💕' },
  { value: 'weather', label: 'Thời tiết hôm nay', emoji: '☀️' },
  { value: 'celeb', label: 'Mặc theo Celeb/KOL', emoji: '⭐' },
];

export const CELEB_LIST = [
  'Châu Bùi',
  'Quỳnh Anh Shyn',
  'Chi Pu',
  'Hana Giang Anh',
  'Khánh Linh Bùi',
  'Chloe Nguyen',
  'Hương Giang',
  'Sơn Tùng M-TP',
  'Minh Tú',
  'Wyn Anh',
  'Tóc Tiên',
  'Ninh Dương Lan Ngọc',
  'Đông Nhi',
  'Hà Hồ',
  'Binz',
];

export const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: 'Áo',
  bottom: 'Quần/Váy',
  shoes: 'Giày',
  accessory: 'Phụ kiện',
  outerwear: 'Áo khoác',
};

export const CATEGORY_EMOJI: Record<ClothingCategory, string> = {
  top: '👕',
  bottom: '👖',
  shoes: '👟',
  accessory: '💍',
  outerwear: '🧥',
};

export const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  hourglass: 'Đồng hồ cát',
  pear: 'Quả lê',
  apple: 'Quả táo',
  rectangle: 'Hình chữ nhật',
  inverted_triangle: 'Tam giác ngược',
  athletic: 'Thể thao',
};

export const SKIN_TONE_LABELS: Record<SkinTone, string> = {
  fair: 'Trắng',
  medium: 'Vàng',
  tan: 'Ngăm',
  dark: 'Đen',
};
