import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type ActividadTipo = 'corte' | 'examen';

type ActividadFormPayload = {
  nombre: string;
  tipo: ActividadTipo;
  peso_porcentaje: number;
};

type ActividadFormModalProps = {
  visible: boolean;
  submitting: boolean;
  puntosDisponibles: number;
  onClose: () => void;
  onSubmit: (payload: ActividadFormPayload) => Promise<void>;
};

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function ActividadFormModal({
  visible,
  submitting,
  puntosDisponibles,
  onClose,
  onSubmit,
}: ActividadFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<ActividadTipo>('corte');
  const [peso, setPeso] = useState('');
  const [error, setError] = useState<string | null>(null);

  const maxPeso = useMemo(() => roundTo2(Math.max(0, puntosDisponibles)), [puntosDisponibles]);

  useEffect(() => {
    if (!visible) {
      setNombre('');
      setTipo('corte');
      setPeso('');
      setError(null);
      return;
    }
  }, [visible]);

  const handleSubmit = async () => {
    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setError('El nombre de la actividad es obligatorio.');
      return;
    }

    if (!tipo) {
      setError('Selecciona un tipo de actividad.');
      return;
    }

    const parsedPeso = Number(peso.replace(',', '.'));
    if (!peso.trim() || Number.isNaN(parsedPeso)) {
      setError('Ingresa un peso válido.');
      return;
    }

    if (parsedPeso <= 0) {
      setError('El peso debe ser mayor que 0.');
      return;
    }

    const roundedPeso = roundTo2(parsedPeso);
    if (roundedPeso > maxPeso) {
      setError(`El peso supera los puntos disponibles (${maxPeso}).`);
      return;
    }

    setError(null);
    await onSubmit({
      nombre: cleanNombre,
      tipo,
      peso_porcentaje: roundedPeso,
    });
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
                  <CustomText className="text-2xl font-black text-black">Nueva actividad</CustomText>
                  <CustomText className="mt-2 text-sm font-medium text-[#6B5A4A]">
                    Configura cortes o examen sin pasar de 100 puntos por parcial.
                  </CustomText>

                  <View className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                    <CustomText className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      Nombre
                    </CustomText>
                    <TextInput
                      value={nombre}
                      onChangeText={setNombre}
                      editable={!submitting}
                      placeholder="Ej: Sistemático 1"
                      placeholderTextColor="#9F8B78"
                      className="text-base font-bold text-black"
                      autoCapitalize="sentences"
                      maxLength={100}
                    />
                  </View>

                  <View className="mt-3 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                    <CustomText className="mb-2 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      Tipo
                    </CustomText>

                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.9}
                        disabled={submitting}
                        onPress={() => setTipo('corte')}
                        className={`rounded-full border-[3px] px-4 py-2 ${
                          tipo === 'corte' ? 'border-black bg-[#D7ECFF]' : 'border-black bg-[#F3E7D5]'
                        }`}
                      >
                        <CustomText className="text-xs font-black text-black">Corte</CustomText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.9}
                        disabled={submitting}
                        onPress={() => setTipo('examen')}
                        className={`rounded-full border-[3px] px-4 py-2 ${
                          tipo === 'examen' ? 'border-black bg-[#FFD98E]' : 'border-black bg-[#F3E7D5]'
                        }`}
                      >
                        <CustomText className="text-xs font-black text-black">Examen</CustomText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mt-3 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                    <CustomText className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      Peso
                    </CustomText>
                    <TextInput
                      value={peso}
                      onChangeText={setPeso}
                      editable={!submitting}
                      placeholder={`Máximo ${maxPeso}`}
                      placeholderTextColor="#9F8B78"
                      className="text-base font-bold text-black"
                      keyboardType="decimal-pad"
                    />

                    <CustomText className="mt-2 text-xs font-bold text-[#6B5A4A]">
                      Puntos disponibles: {maxPeso}
                    </CustomText>
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
                    {submitting ? 'Guardando...' : 'Crear actividad'}
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
