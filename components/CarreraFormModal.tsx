import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type CarreraFormModalProps = {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (nombre: string) => Promise<void>;
};

export default function CarreraFormModal({
  visible,
  submitting,
  onClose,
  onSubmit,
}: CarreraFormModalProps) {
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
      setError('Escribe un nombre para la carrera.');
      return;
    }
    setError(null);
    await onSubmit(clean);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/35" onPress={onClose}>
          <View className="flex-1 justify-end">
            <Pressable className="rounded-t-[36px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-8">
              <View className="mb-4 items-center">
                <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
              </View>

              <View className="relative mb-4">
                <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-black" />
                <View className="rounded-[28px] border-[3px] border-black bg-[#FFF7E8] p-5">
                  <CustomText className="text-2xl font-black text-black">Nueva Carrera</CustomText>
                  <CustomText className="mt-2 text-sm font-medium text-[#6B5A4A]">
                    Agrega el nombre real de la carrera para organizar tus clases.
                  </CustomText>

                  <View className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                    <CustomText className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      Nombre de la carrera
                    </CustomText>
                    <TextInput
                      value={nombre}
                      onChangeText={setNombre}
                      editable={!submitting}
                      placeholder="Ej: Ingeniería en Sistemas"
                      placeholderTextColor="#9F8B78"
                      className="text-base font-bold text-black"
                      autoCapitalize="words"
                      maxLength={100}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>

                  {error ? (
                    <CustomText className="mt-3 text-sm font-bold text-[#A6342C]">{error}</CustomText>
                  ) : null}
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
                    {submitting ? 'Guardando...' : 'Crear carrera'}
                  </CustomText>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
