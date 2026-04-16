import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';
import type { AsistenciaSesion } from '@/lib/services/asistenciaService';

type ManualSesionInput = {
  fecha: string;
  tema?: string;
};

type GenerarMesInput = {
  year: number;
  month: number;
  cantidad: number;
  weekday: number;
  temaBase?: string;
};

type Props = {
  visible: boolean;
  submitting: boolean;
  sesiones: AsistenciaSesion[];
  onClose: () => void;
  onCreateManual: (input: ManualSesionInput) => Promise<void>;
  onGenerateMonth: (input: GenerarMesInput) => Promise<void>;
  onDeleteSesion: (sesionId: string) => Promise<void>;
};

function shortDate(fecha: string): string {
  const parts = fecha.split('-');
  if (parts.length !== 3) {
    return fecha;
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function AsistenciaSesionesConfigModal({
  visible,
  submitting,
  sesiones,
  onClose,
  onCreateManual,
  onGenerateMonth,
  onDeleteSesion,
}: Props) {
  const now = new Date();

  useEffect(() => {
    console.log('[MODAL] visible cambió a:', visible);
  }, [visible]);

  const [manualFecha, setManualFecha] = useState('');
  const [manualTema, setManualTema] = useState('');
  const [bulkYear, setBulkYear] = useState(String(now.getFullYear()));
  const [bulkMonth, setBulkMonth] = useState(String(now.getMonth() + 1));
  const [bulkCantidad, setBulkCantidad] = useState('4');
  const [bulkWeekday, setBulkWeekday] = useState('1');
  const [bulkTemaBase, setBulkTemaBase] = useState('Encuentro');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setError(null);
    }
  }, [visible]);

  const sesionesOrdenadas = useMemo(
    () => [...sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [sesiones]
  );

  const handleCreateManual = async () => {
    if (!manualFecha.trim()) {
      setError('Ingresa una fecha en formato YYYY-MM-DD.');
      return;
    }
    setError(null);
    await onCreateManual({
      fecha: manualFecha.trim(),
      tema: manualTema.trim() || undefined,
    });
    setManualFecha('');
    setManualTema('');
  };

  const handleGenerateMonth = async () => {
    const year = Number(bulkYear);
    const month = Number(bulkMonth);
    const cantidad = Number(bulkCantidad);
    const weekday = Number(bulkWeekday);

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(cantidad) ||
      Number.isNaN(weekday)
    ) {
      setError('Completa los campos numericos para generar sesiones.');
      return;
    }

    if (month < 1 || month > 12) {
      setError('El mes debe estar entre 1 y 12.');
      return;
    }

    if (cantidad < 1) {
      setError('La cantidad de sesiones debe ser mayor a 0.');
      return;
    }

    if (weekday < 0 || weekday > 6) {
      setError('El dia de semana debe estar entre 0 y 6.');
      return;
    }

    setError(null);
    await onGenerateMonth({
      year,
      month,
      cantidad,
      weekday,
      temaBase: bulkTemaBase.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/35" onPress={onClose} />
        <View 
          className="max-h-[88%] rounded-t-[34px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-6"
          onStartShouldSetResponder={() => true}
        >
            <View className="mb-3 items-center">
              <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
            </View>

            <CustomText className="text-2xl font-black text-black">Configurar sesiones</CustomText>
            <CustomText className="mt-1 text-sm font-semibold text-[#6B5A4A]">
              Crea sesiones manuales o genera encuentros por mes.
            </CustomText>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View className="mt-4 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-4">
                <CustomText className="text-sm font-black text-black">Nueva sesion manual</CustomText>
                <View className="mt-3 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                  <CustomText className="text-[11px] font-black text-[#6B5A4A]">Fecha (YYYY-MM-DD)</CustomText>
                  <TextInput
                    value={manualFecha}
                    onChangeText={setManualFecha}
                    editable={!submitting}
                    placeholder="2026-03-05"
                    placeholderTextColor="#9F8B78"
                    className="text-base font-bold text-black"
                  />
                </View>
                <View className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                  <CustomText className="text-[11px] font-black text-[#6B5A4A]">Tema (opcional)</CustomText>
                  <TextInput
                    value={manualTema}
                    onChangeText={setManualTema}
                    editable={!submitting}
                    placeholder="Ej: Unidad 2"
                    placeholderTextColor="#9F8B78"
                    className="text-base font-bold text-black"
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={submitting}
                  onPress={() => {
                    void handleCreateManual();
                  }}
                  className="mt-3 rounded-xl border-[3px] border-black bg-[#D7ECFF] px-4 py-3"
                >
                  <CustomText className="text-center text-sm font-black text-black">
                    {submitting ? 'Guardando...' : 'Agregar sesion'}
                  </CustomText>
                </TouchableOpacity>
              </View>

              <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-4">
                <CustomText className="text-sm font-black text-black">Generar por mes</CustomText>
                <CustomText className="mt-1 text-[11px] font-semibold text-[#6B5A4A]">
                  Dia semana: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab.
                </CustomText>

                <View className="mt-3 flex-row gap-2">
                  <View className="flex-1 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                    <CustomText className="text-[11px] font-black text-[#6B5A4A]">Anio</CustomText>
                    <TextInput
                      value={bulkYear}
                      onChangeText={setBulkYear}
                      editable={!submitting}
                      keyboardType="number-pad"
                      className="text-base font-bold text-black"
                    />
                  </View>
                  <View className="flex-1 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                    <CustomText className="text-[11px] font-black text-[#6B5A4A]">Mes (1-12)</CustomText>
                    <TextInput
                      value={bulkMonth}
                      onChangeText={setBulkMonth}
                      editable={!submitting}
                      keyboardType="number-pad"
                      className="text-base font-bold text-black"
                    />
                  </View>
                </View>

                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                    <CustomText className="text-[11px] font-black text-[#6B5A4A]">Cantidad</CustomText>
                    <TextInput
                      value={bulkCantidad}
                      onChangeText={setBulkCantidad}
                      editable={!submitting}
                      keyboardType="number-pad"
                      className="text-base font-bold text-black"
                    />
                  </View>
                  <View className="flex-1 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                    <CustomText className="text-[11px] font-black text-[#6B5A4A]">Dia semana</CustomText>
                    <TextInput
                      value={bulkWeekday}
                      onChangeText={setBulkWeekday}
                      editable={!submitting}
                      keyboardType="number-pad"
                      className="text-base font-bold text-black"
                    />
                  </View>
                </View>

                <View className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                  <CustomText className="text-[11px] font-black text-[#6B5A4A]">Tema base</CustomText>
                  <TextInput
                    value={bulkTemaBase}
                    onChangeText={setBulkTemaBase}
                    editable={!submitting}
                    placeholder="Encuentro"
                    placeholderTextColor="#9F8B78"
                    className="text-base font-bold text-black"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={submitting}
                  onPress={() => {
                    void handleGenerateMonth();
                  }}
                  className="mt-3 rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-3"
                >
                  <CustomText className="text-center text-sm font-black text-black">
                    {submitting ? 'Generando...' : 'Generar sesiones del mes'}
                  </CustomText>
                </TouchableOpacity>
              </View>

              {error ? <CustomText className="mt-3 text-sm font-bold text-[#A6342C]">{error}</CustomText> : null}

              <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-4">
                <CustomText className="text-sm font-black text-black">
                  Sesiones actuales ({sesionesOrdenadas.length})
                </CustomText>

                {sesionesOrdenadas.length === 0 ? (
                  <CustomText className="mt-2 text-xs font-semibold text-[#6B5A4A]">
                    Aun no hay sesiones configuradas.
                  </CustomText>
                ) : null}

                {sesionesOrdenadas.map((sesion) => (
                  <View
                    key={sesion.id}
                    className="mt-2 flex-row items-center justify-between rounded-xl border-[2px] border-black bg-white px-3 py-2"
                  >
                    <View className="flex-1 pr-2">
                      <CustomText className="text-xs font-black text-black">{shortDate(sesion.fecha)}</CustomText>
                      <CustomText className="text-xs font-semibold text-[#6B5A4A]">
                        {sesion.tema || 'Sin tema'}
                      </CustomText>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={submitting}
                      onPress={() => {
                        void onDeleteSesion(sesion.id);
                      }}
                      className="rounded-lg border-[2px] border-black bg-[#FFC9C2] px-3 py-1"
                    >
                      <CustomText className="text-xs font-black text-black">Eliminar</CustomText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={submitting}
                  onPress={onClose}
                  className="flex-1 rounded-2xl border-[3px] border-black bg-white px-4 py-3"
                >
                  <CustomText className="text-center text-sm font-black text-black">Cerrar</CustomText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
      </View>
    </Modal>
  );
}
