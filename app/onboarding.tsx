import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Sparkles, User, Ruler, Palette } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useProfile } from '@/contexts/ProfileContext';
import { useTheme } from '@/hooks/useTheme';
import { GENDER_OPTIONS, BODY_SHAPE_OPTIONS, SKIN_TONE_OPTIONS } from '@/constants/data';
import { BodyShape, SkinTone } from '@/types';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { updateProfile, completeOnboarding } = useProfile();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<'nam' | 'nu' | 'khac'>('nu');
  const [age, setAge] = useState('25');
  const [height, setHeight] = useState('160');
  const [weight, setWeight] = useState('50');
  const [bodyShape, setBodyShape] = useState<BodyShape>('rectangle');
  const [skinTone, setSkinTone] = useState<SkinTone>('medium');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) {
      animateTransition(step + 1);
    } else {
      updateProfile({
        gender,
        age: parseInt(age, 10) || 25,
        height: parseInt(height, 10) || 160,
        weight: parseInt(weight, 10) || 50,
        bodyShape,
        skinTone,
      });
      completeOnboarding();
      router.replace('/(tabs)/(home)' as any);
    }
  };

  const stepTitles = [
    { icon: '👋', title: 'Xin chào!', subtitle: 'Hãy cho MixDo biết về bạn' },
    { icon: '📏', title: 'Số đo của bạn', subtitle: 'Giúp AI gợi ý chính xác hơn' },
    { icon: '✨', title: 'Dáng người', subtitle: 'Chọn dáng người gần nhất với bạn' },
    { icon: '🎨', title: 'Tông da', subtitle: 'Để phối màu phù hợp nhất' },
  ];

  const styles = makeStyles(colors);

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.fieldLabel}>Giới tính</Text>
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, gender === opt.value && styles.chipActive]}
                  onPress={() => {
                    setGender(opt.value);
                    Haptics.selectionAsync();
                  }}
                  testID={`gender-${opt.value}`}
                >
                  <Text style={[styles.chipText, gender === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Tuổi</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="25"
              placeholderTextColor={colors.textTertiary}
              testID="age-input"
            />
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.fieldLabel}>Chiều cao (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="160"
              placeholderTextColor={colors.textTertiary}
              testID="height-input"
            />
            <Text style={styles.fieldLabel}>Cân nặng (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              placeholder="50"
              placeholderTextColor={colors.textTertiary}
              testID="weight-input"
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.optionGrid}>
              {BODY_SHAPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, bodyShape === opt.value && styles.optionCardActive]}
                  onPress={() => {
                    setBodyShape(opt.value);
                    Haptics.selectionAsync();
                  }}
                  testID={`body-${opt.value}`}
                >
                  <Text style={[styles.optionText, bodyShape === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.optionGrid}>
              {SKIN_TONE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, skinTone === opt.value && styles.optionCardActive]}
                  onPress={() => {
                    setSkinTone(opt.value);
                    Haptics.selectionAsync();
                  }}
                  testID={`skin-${opt.value}`}
                >
                  <Text style={[styles.optionText, skinTone === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.logo}>MixDo AI</Text>
              <View style={styles.progressRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i <= step && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <Animated.View
              style={[
                styles.contentArea,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={styles.stepEmoji}>{stepTitles[step].icon}</Text>
              <Text style={styles.stepTitle}>{stepTitles[step].title}</Text>
              <Text style={styles.stepSubtitle}>{stepTitles[step].subtitle}</Text>
              {renderStepContent()}
            </Animated.View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
              testID="next-button"
            >
              <Text style={styles.nextButtonText}>
                {step < 3 ? 'Tiếp tục' : 'Bắt đầu Mix đồ!'}
              </Text>
              {step < 3 ? (
                <ChevronRight size={20} color="#FFF" />
              ) : (
                <Sparkles size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
    },
    header: {
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    logo: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    progressRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 20,
    },
    progressDot: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
    },
    contentArea: {
      flex: 1,
      paddingTop: 32,
    },
    stepEmoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    stepTitle: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 6,
    },
    stepSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 28,
    },
    stepContent: {},
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chip: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 17,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    optionGrid: {
      gap: 10,
    },
    optionCard: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    optionCardActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    optionText: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.text,
    },
    optionTextActive: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
    bottomBar: {
      paddingHorizontal: 24,
      paddingBottom: 8,
      paddingTop: 12,
    },
    nextButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    nextButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
  });
