import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CustomText } from './CustomText';
import SelectOptionModal from './SelectOptionModal';
import DateCalendarPicker from './DateCalendarPicker';
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
  pendingDeleteSesionIds: Set<string>;
  onClose: () => void;
  onCreateManual: (input: ManualSesionInput) => Promise<void>;
  onGenerateMonth: (input: GenerarMesInput) => Promise<void>;
  onDeleteSesion: (sesionId: string) => Promise<void>;
};

type SessionType = 'single' | 'multiple';
type BulkSelectField = 'year' | 'month' | 'weekday' | null;

function shortDate(fecha: string): string {
  const parts = fecha.split('-');
  if (parts.length !== 3) {
    return fecha;
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function manualDateLabel(fecha: string): string {
  if (!fecha) {
    return 'Seleccionar fecha';
  }

  return shortDate(fecha);
}

function countWeekdaysInMonth(year: number, month: number, weekday: number): number {
  let count = 0;
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    if (cursor.getDay() === weekday) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export default function AsistenciaSesionesConfigModal({
  visible,
  submitting,
  sesiones,
  pendingDeleteSesionIds,
  onClose,
  onCreateManual,
  onGenerateMonth,
  onDeleteSesion,
}: Props) {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const openedAtRef = useRef(0);
  const now = new Date();
  const monthOptions = useMemo(
    () => [
      { id: '1', label: 'Enero' },
      { id: '2', label: 'Febrero' },
      { id: '3', label: 'Marzo' },
      { id: '4', label: 'Abril' },
      { id: '5', label: 'Mayo' },
      { id: '6', label: 'Junio' },
      { id: '7', label: 'Julio' },
      { id: '8', label: 'Agosto' },
      { id: '9', label: 'Septiembre' },
      { id: '10', label: 'Octubre' },
      { id: '11', label: 'Noviembre' },
      { id: '12', label: 'Diciembre' },
    ],
    []
  );
  const weekdayOptions = useMemo(
    () => [
      { id: '0', label: 'Domingo' },
      { id: '1', label: 'Lunes' },
      { id: '2', label: 'Martes' },
      { id: '3', label: 'Miercoles' },
      { id: '4', label: 'Jueves' },
      { id: '5', label: 'Viernes' },
      { id: '6', label: 'Sabado' },
    ],
    []
  );
  const yearOptions = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const value = now.getFullYear() - 2 + index;
        return { id: String(value), label: String(value) };
      }),
    [now]
  );

  const [sessionType, setSessionType] = useState<SessionType>('single');
  const [bulkSelectField, setBulkSelectField] = useState<BulkSelectField>(null);
  const [manualCalendarVisible, setManualCalendarVisible] = useState(false);
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
      setBulkSelectField(null);
      setManualCalendarVisible(false);
      return;
    }
    openedAtRef.current = Date.now();
  }, [visible]);

  const handleBackdropPress = () => {
    if (Date.now() - openedAtRef.current < 180) {
      return;
    }
    onClose();
  };

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

    const maxPosibles = countWeekdaysInMonth(year, month, weekday);
    if (cantidad > maxPosibles) {
      const mesLabel = monthOptions.find((option) => option.id === String(month))?.label ?? `Mes ${month}`;
      const diaLabel = weekdayOptions.find((option) => option.id === String(weekday))?.label ?? 'dia seleccionado';
      setError(`En ${mesLabel} ${year} solo hay ${maxPosibles} ${diaLabel.toLowerCase()}. Ajusta la cantidad.`);
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

  const selectedMonthLabel =
    monthOptions.find((option) => option.id === bulkMonth)?.label ?? 'Seleccionar mes';
  const selectedWeekdayLabel =
    weekdayOptions.find((option) => option.id === bulkWeekday)?.label ?? 'Seleccionar dia';
  const selectedYearLabel =
    yearOptions.find((option) => option.id === bulkYear)?.label ?? 'Seleccionar anio';

  const selectTitle =
    bulkSelectField === 'year'
      ? 'Seleccionar anio'
      : bulkSelectField === 'month'
        ? 'Seleccionar mes'
        : 'Seleccionar dia de semana';

  const selectOptions =
    bulkSelectField === 'year'
      ? yearOptions
      : bulkSelectField === 'month'
        ? monthOptions
        : weekdayOptions;

  const selectedOptionId =
    bulkSelectField === 'year'
      ? bulkYear
      : bulkSelectField === 'month'
        ? bulkMonth
        : bulkWeekday;

  const handleSelectBulkOption = (option: { id: string }) => {
    if (bulkSelectField === 'year') {
      setBulkYear(option.id);
    } else if (bulkSelectField === 'month') {
      setBulkMonth(option.id);
    } else {
      setBulkWeekday(option.id);
    }
    setBulkSelectField(null);
    setError(null);
  };

  const toggleBulkSelectField = (field: Exclude<BulkSelectField, null>) => {
    setBulkSelectField((current) => (current === field ? null : field));
  };

  const getBulkOptionsByField = (field: Exclude<BulkSelectField, null>) => {
    if (field === 'year') return yearOptions;
    if (field === 'month') return monthOptions;
    return weekdayOptions;
  };

  const renderWebSelectDropdown = (field: Exclude<BulkSelectField, null>) => {
    if (!isWeb || bulkSelectField !== field) {
      return null;
    }

    const options = getBulkOptionsByField(field);
    const currentId = field === 'year' ? bulkYear : field === 'month' ? bulkMonth : bulkWeekday;
    const useCompactGrid = field === 'month' || field === 'weekday';

    return (
      <View className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border-[3px] border-black bg-white p-2">
        {useCompactGrid ? (
          <View className="flex-row flex-wrap gap-2">
            {options.map((option) => {
              const isSelected = option.id === currentId;
              return (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.9}
                  onPress={() => handleSelectBulkOption(option)}
                  className={`min-w-[92px] flex-1 rounded-lg border-[3px] px-2 py-2 ${
                    isSelected ? 'border-black bg-[#FFD98E]' : 'border-black bg-[#FDF9F1]'
                  }`}
                >
                  <CustomText className="text-center text-xs font-black text-black">{option.label}</CustomText>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <ScrollView className="max-h-36" showsVerticalScrollIndicator={false}>
            {options.map((option, index) => {
              const isSelected = option.id === currentId;
              return (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.9}
                  onPress={() => handleSelectBulkOption(option)}
                  className={`rounded-xl border-[3px] px-3 py-2 ${
                    isSelected ? 'border-black bg-[#FFD98E]' : 'border-black bg-[#FDF9F1]'
                  } ${index < options.length - 1 ? 'mb-2' : ''}`}
                >
                  <CustomText className="text-sm font-black text-black">{option.label}</CustomText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  const content = (
    <View className={isWeb ? 'flex-1' : ''}>
      {!isWeb ? (
        <SelectOptionModal
          visible={bulkSelectField !== null}
          title={selectTitle}
          emptyMessage="No hay opciones disponibles."
          options={selectOptions}
          selectedId={selectedOptionId}
          onClose={() => setBulkSelectField(null)}
          onSelect={handleSelectBulkOption}
        />
      ) : null}

      <DateCalendarPicker
        visible={manualCalendarVisible}
        selectedDate={manualFecha || null}
        occupiedDates={sesiones.map((sesion) => sesion.fecha)}
        onClose={() => setManualCalendarVisible(false)}
        onSelectDate={(dateIso) => {
          setManualFecha(dateIso);
          setManualCalendarVisible(false);
          setError(null);
        }}
        title="Seleccionar fecha de sesion"
      />

      <View className="mb-3 items-center">
        <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
      </View>

      <CustomText className="text-2xl font-black text-black">Configurar sesiones</CustomText>
      <CustomText className="mt-1 text-sm font-semibold text-[#6B5A4A]">
        Crea sesiones manuales o genera encuentros por mes.
      </CustomText>

      <ScrollView
        className={isWeb ? 'mt-4 flex-1' : 'mt-4'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="mt-4 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-2">
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={submitting}
              onPress={() => setSessionType('single')}
              className={`flex-1 rounded-xl border-[3px] px-3 py-2 ${
                sessionType === 'single' ? 'border-black bg-[#D7ECFF]' : 'border-black bg-white'
              }`}
            >
              <CustomText className="text-center text-xs font-black text-black">Sesion unica</CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={submitting}
              onPress={() => setSessionType('multiple')}
              className={`flex-1 rounded-xl border-[3px] px-3 py-2 ${
                sessionType === 'multiple' ? 'border-black bg-[#BDE9C7]' : 'border-black bg-white'
              }`}
            >
              <CustomText className="text-center text-xs font-black text-black">Multiples sesiones</CustomText>
            </TouchableOpacity>
          </View>
        </View>

        {sessionType === 'single' ? (
        <View className="mt-4 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-4">
                <CustomText className="text-sm font-black text-black">Nueva sesion manual</CustomText>
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={submitting}
                  onPress={() => {
                    setBulkSelectField(null);
                    setManualCalendarVisible(true);
                  }}
                  className="mt-3 rounded-xl border-[3px] border-black bg-white px-3 py-2"
                >
                  <CustomText className="text-[11px] font-black text-[#6B5A4A]">Fecha (calendario)</CustomText>
                  <View className="mt-1 flex-row items-center justify-between">
                    <CustomText className="text-base font-bold text-black">{manualDateLabel(manualFecha)}</CustomText>
                    <CustomText className="text-xs font-black text-[#6B5A4A]">▼</CustomText>
                  </View>
                  <CustomText className="mt-1 text-[11px] font-semibold text-[#6B5A4A]">
                    Veras los encuentros existentes y podras elegir una fecha libre.
                  </CustomText>
                </TouchableOpacity>
                <View className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                  <CustomText className="text-[11px] font-black text-[#6B5A4A]">Tema (opcional)</CustomText>
                  <TextInput
                    value={manualTema}
                    onChangeText={setManualTema}
                    onFocus={() => setBulkSelectField(null)}
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
        ) : null}

        {sessionType === 'multiple' ? (
        <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-4">
                {isWeb && bulkSelectField !== null ? (
                  <Pressable
                    className="absolute inset-0 z-40"
                    onPress={() => setBulkSelectField(null)}
                  />
                ) : null}
                <CustomText className="text-sm font-black text-black">Generar por mes</CustomText>
                <CustomText className="mt-1 text-[11px] font-semibold text-[#6B5A4A]">
                  Elige anio, mes y dia para generar varias sesiones automaticamente.
                </CustomText>

                <View
                  className="mt-3 flex-row justify-between"
                  style={{ zIndex: bulkSelectField === 'year' || bulkSelectField === 'month' ? 120 : 1 }}
                >
                  <View
                    className="relative"
                    style={{ width: '49.2%', zIndex: bulkSelectField === 'year' ? 80 : 1 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={submitting}
                      onPress={() => toggleBulkSelectField('year')}
                      className="rounded-xl border-[3px] border-black bg-white px-3 py-2"
                    >
                      <CustomText className="text-[11px] font-black text-[#6B5A4A]">Anio</CustomText>
                      <View className="mt-1 flex-row items-center justify-between">
                        <CustomText className="text-base font-bold text-black">{selectedYearLabel}</CustomText>
                        <CustomText className="text-xs font-black text-[#6B5A4A]">
                          {bulkSelectField === 'year' ? '▲' : '▼'}
                        </CustomText>
                      </View>
                    </TouchableOpacity>
                    {renderWebSelectDropdown('year')}
                  </View>

                  <View
                    className="relative"
                    style={{ width: '49.2%', zIndex: bulkSelectField === 'month' ? 80 : 1 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={submitting}
                      onPress={() => toggleBulkSelectField('month')}
                      className="rounded-xl border-[3px] border-black bg-white px-3 py-2"
                    >
                      <CustomText className="text-[11px] font-black text-[#6B5A4A]">Mes</CustomText>
                      <View className="mt-1 flex-row items-center justify-between">
                        <CustomText className="text-base font-bold text-black">{selectedMonthLabel}</CustomText>
                        <CustomText className="text-xs font-black text-[#6B5A4A]">
                          {bulkSelectField === 'month' ? '▲' : '▼'}
                        </CustomText>
                      </View>
                    </TouchableOpacity>
                    {renderWebSelectDropdown('month')}
                  </View>
                </View>

                <View
                  className="mt-2 flex-row justify-between"
                  style={{ zIndex: bulkSelectField === 'weekday' ? 120 : 1 }}
                >
                  <View
                    className="rounded-xl border-[3px] border-black bg-white px-3 py-2"
                    style={{ width: '49.2%' }}
                  >
                    <CustomText className="text-[11px] font-black text-[#6B5A4A]">Cantidad</CustomText>
                    <TextInput
                      value={bulkCantidad}
                      onChangeText={setBulkCantidad}
                      onFocus={() => setBulkSelectField(null)}
                      editable={!submitting}
                      keyboardType="number-pad"
                      className="text-base font-bold text-black"
                    />
                  </View>
                  <View
                    className="relative"
                    style={{ width: '49.2%', zIndex: bulkSelectField === 'weekday' ? 80 : 1 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={submitting}
                      onPress={() => toggleBulkSelectField('weekday')}
                      className="rounded-xl border-[3px] border-black bg-white px-3 py-2"
                    >
                      <CustomText className="text-[11px] font-black text-[#6B5A4A]">Dia semana</CustomText>
                      <View className="mt-1 flex-row items-center justify-between">
                        <CustomText className="text-base font-bold text-black">{selectedWeekdayLabel}</CustomText>
                        <CustomText className="text-xs font-black text-[#6B5A4A]">
                          {bulkSelectField === 'weekday' ? '▲' : '▼'}
                        </CustomText>
                      </View>
                    </TouchableOpacity>
                    {renderWebSelectDropdown('weekday')}
                  </View>
                </View>

                <View className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2">
                  <CustomText className="text-[11px] font-black text-[#6B5A4A]">Tema base</CustomText>
                  <TextInput
                    value={bulkTemaBase}
                    onChangeText={setBulkTemaBase}
                    onFocus={() => setBulkSelectField(null)}
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
        ) : null}

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
                      disabled={submitting || pendingDeleteSesionIds.has(sesion.id)}
                      onPress={() => {
                        void onDeleteSesion(sesion.id);
                      }}
                      className="rounded-lg border-[2px] border-black bg-[#FFC9C2] px-3 py-1"
                    >
                      <CustomText className="text-xs font-black text-black">
                        {pendingDeleteSesionIds.has(sesion.id) ? 'Eliminando...' : 'Eliminar'}
                      </CustomText>
                    </TouchableOpacity>
                  </View>
                ))}
        </View>

      </ScrollView>

      {isWeb ? (
        <View className="mt-3 flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={submitting}
            onPress={onClose}
            className="flex-1 rounded-2xl border-[3px] border-black bg-white px-4 py-3"
          >
            <CustomText className="text-center text-sm font-black text-black">Cerrar</CustomText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  if (isWeb) {
    if (!visible) {
      return null;
    }

    return (
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2000,
        }}
      >
        <Pressable className="flex-1 bg-black/40" onPress={handleBackdropPress}>
          <View className="flex-1 items-center justify-center px-4 py-6">
            <Pressable
              onPress={() => {}}
              className="w-full overflow-hidden rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5"
              style={{
                width: Math.min(width - 40, 1080),
                height: Math.min(height - 48, 760),
              }}
            >
              <View className="max-h-full flex-1 overflow-hidden">{content}</View>
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/35" onPress={handleBackdropPress}>
        <View className="flex-1 justify-end">
          <Pressable
            className="max-h-[88%] rounded-t-[34px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-6"
            onPress={() => {}}
          >
            {content}
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
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
