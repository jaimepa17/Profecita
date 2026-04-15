import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardEvent, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type NameFormModalProps = {
  visible: boolean;
  title: string;
  helperText?: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  submitting: boolean;
  maxLength?: number;
  onClose: () => void;
  onSubmit: (nombre: string) => Promise<void>;
};

export default function NameFormModal({
  visible,
  title,
  helperText,
  label,
  placeholder,
  submitLabel,
  submitting,
  maxLength = 100,
  onClose,
  onSubmit,
}: NameFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setNombre('');
      setError(null);
      slideAnim.setValue(0);
      return;
    }

    slideAnim.setValue(0);
  }, [visible, slideAnim]);

  useEffect(() => {
    if (!visible) return;

    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      Animated.timing(slideAnim, {
        toValue: -e.endCoordinates.height,
        duration: e.duration,
        useNativeDriver: true,
      }).start();
    });

    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [visible, slideAnim]);

  const handleSubmit = async () => {
    const clean = nombre.trim();
    if (!clean) {
      setError('Completa este campo para continuar.');
      return;
    }

    setError(null);
    await onSubmit(clean);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
        <Pressable className="flex-1 bg-black/35" onPress={onClose}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable className="rounded-t-[36px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-8">
              <View className="mb-4 items-center">
                <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
              </View>

              <View className="relative mb-4">
                <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-black" />
                <View className="rounded-[28px] border-[3px] border-black bg-[#FFF7E8] p-5">
                  <CustomText className="text-2xl font-black text-black">{title}</CustomText>
                  {helperText ? (
                    <CustomText className="mt-2 text-sm font-medium text-[#6B5A4A]">{helperText}</CustomText>
                  ) : null}

                  <View className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                    <CustomText className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      {label}
                    </CustomText>
                    <TextInput
                      value={nombre}
                      onChangeText={setNombre}
                      editable={!submitting}
                      placeholder={placeholder}
                      placeholderTextColor="#9F8B78"
                      className="text-base font-bold text-black"
                      autoCapitalize="words"
                      maxLength={maxLength}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>

                  {error ? <CustomText className="mt-3 text-sm font-bold text-[#A6342C]">{error}</CustomText> : null}
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  disabled={submitting}
                  onPress={onClose}
                  className="flex-1 rounded-2xl border-[3px] border-black bg-white px-4 py-4"
                >
                  <CustomText className="text-center text-sm font-black text-black">Cancelar</CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  disabled={submitting}
                  onPress={handleSubmit}
                  className="flex-1 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-4 py-4"
                >
                  <CustomText className="text-center text-sm font-black text-black">
                    {submitting ? 'Guardando...' : submitLabel}
                  </CustomText>
                </TouchableOpacity>
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
