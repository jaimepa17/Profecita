import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  useEffect(() => {
    if (!visible) {
      setNombre('');
      setError(null);
    }
  }, [visible]);

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
      <Pressable className="flex-1 bg-black/35" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable className="rounded-t-[36px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-8">
            <View className="mb-4 items-center">
              <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
            </View>

            <View className="relative mb-4">
              <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-black" />
              <View className="rounded-[28px] border-[3px] border-black bg-[#FFF7E8] p-5">
                <Text className="text-2xl font-black text-black">{title}</Text>
                {helperText ? (
                  <Text className="mt-2 text-sm font-medium text-[#6B5A4A]">{helperText}</Text>
                ) : null}

                <View className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                  <Text className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    {label}
                  </Text>
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

                {error ? <Text className="mt-3 text-sm font-bold text-[#A6342C]">{error}</Text> : null}
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
                <Text className="text-center text-sm font-black text-black">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={submitting}
                onPress={handleSubmit}
                className="flex-1 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-4 py-4"
              >
                <Text className="text-center text-sm font-black text-black">
                  {submitting ? 'Guardando...' : submitLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
