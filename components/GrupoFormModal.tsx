import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

type GrupoFormModalProps = {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (nombre: string, turno: string | null) => Promise<void>;
};

const TURNOS = ['Matutino', 'Vespertino', 'Nocturno'] as const;

export default function GrupoFormModal({
  visible,
  submitting,
  onClose,
  onSubmit,
}: GrupoFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [turno, setTurno] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setNombre('');
      setTurno('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setError('Escribe un nombre para el grupo.');
      return;
    }

    setError(null);
    await onSubmit(cleanNombre, turno.trim() ? turno.trim() : null);
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
                <Text className="text-2xl font-black text-black">Nuevo Grupo</Text>
                <Text className="mt-2 text-sm font-medium text-[#6B5A4A]">
                  Crea secciones como Grupo A, Grupo B o similares.
                </Text>

                <View className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                  <Text className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    Nombre del grupo
                  </Text>
                  <TextInput
                    value={nombre}
                    onChangeText={setNombre}
                    editable={!submitting}
                    placeholder="Ej: Grupo A"
                    placeholderTextColor="#9F8B78"
                    className="text-base font-bold text-black"
                    autoCapitalize="words"
                    maxLength={50}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                <View className="mt-3 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                  <Text className="mb-2 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    Turno (opcional)
                  </Text>

                  <View className="mb-2 flex-row flex-wrap gap-2">
                    {TURNOS.map((item) => {
                      const selected = turno === item;
                      return (
                        <TouchableOpacity
                          key={item}
                          accessibilityRole="button"
                          activeOpacity={0.9}
                          disabled={submitting}
                          onPress={() => setTurno(item)}
                          className={`rounded-full border-[3px] px-3 py-1.5 ${
                            selected
                              ? 'border-black bg-[#FFD98E]'
                              : 'border-black bg-[#F3E7D5]'
                          }`}
                        >
                          <Text className="text-xs font-black text-black">{item}</Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.9}
                      disabled={submitting}
                      onPress={() => setTurno('')}
                      className="rounded-full border-[3px] border-black bg-white px-3 py-1.5"
                    >
                      <Text className="text-xs font-black text-black">Sin turno</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={turno}
                    onChangeText={setTurno}
                    editable={!submitting}
                    placeholder="O escribe otro turno"
                    placeholderTextColor="#9F8B78"
                    className="text-sm font-bold text-black"
                    maxLength={50}
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
                  {submitting ? 'Guardando...' : 'Crear grupo'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
