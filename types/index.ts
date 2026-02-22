export interface UserProfile {
  gender: 'nam' | 'nu' | 'khac';
  age: number;
  height: number;
  weight: number;
  bodyShape: BodyShape;
  skinTone: SkinTone;
  isOnboarded: boolean;
  fullBodyPhotoUri?: string;
}

export type BodyShape = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted_triangle' | 'athletic';
export type SkinTone = 'fair' | 'medium' | 'tan' | 'dark';

export type ClothingCategory = 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';

export interface WardrobeItem {
  id: string;
  imageUri: string;
  croppedUri?: string;
  category: ClothingCategory;
  label: string;
  color: string;
  addedAt: string;
}

export type Occasion = 'travel' | 'party' | 'date' | 'weather' | 'celeb';

export interface OutfitSuggestion {
  id: string;
  items: WardrobeItem[];
  description: string;
  reasoning: string;
  occasion: Occasion;
  celebName?: string;
  createdAt: string;
  feedback?: 'good' | 'bad';
  feedbackNote?: string;
  isFavorite: boolean;
  generatedImageUri?: string;
  originalPhotoUri?: string;
  isGeneratingImage?: boolean;
  garmentDescriptionEN?: string;
}

export interface OutfitGenerationRequest {
  occasion: Occasion;
  celebName?: string;
}
