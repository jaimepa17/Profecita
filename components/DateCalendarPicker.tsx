import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type Props = {
  visible: boolean;
  selectedDate?: string | null;
  occupiedDates: string[];
  onClose: () => void;
  onSelectDate: (dateIso: string) => void;
  title?: string;
};

type CalendarCell = {
  key: string;
  day: number | null;
  dateIso: string | null;
};

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function toIsoDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parts = value.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function buildCalendarCells(viewYear: number, viewMonth: number): CalendarCell[] {
  const firstDay = new Date(viewYear, viewMonth, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ key: `empty-start-${i}`, day: null, dateIso: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `day-${day}`,
      day,
      dateIso: toIsoDate(viewYear, viewMonth, day),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, day: null, dateIso: null });
  }

  return cells;
}

export default function DateCalendarPicker({
  visible,
  selectedDate,
  occupiedDates,
  onClose,
  onSelectDate,
  title = 'Seleccionar fecha',
}: Props) {
  const isWeb = Platform.OS === 'web';
  const openedAtRef = useRef(0);
  const selected = parseIsoDate(selectedDate);
  const selectedBase = selected ?? new Date();
  const [viewYear, setViewYear] = useState(selectedBase.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedBase.getMonth());

  useEffect(() => {
    if (!visible) {
      return;
    }

    const base = parseIsoDate(selectedDate) ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    openedAtRef.current = Date.now();
  }, [visible, selectedDate]);

  const occupiedSet = useMemo(() => new Set(occupiedDates), [occupiedDates]);
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const handleBackdropPress = () => {
    if (Date.now() - openedAtRef.current < 180) {
      return;
    }

    onClose();
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((curr) => curr - 1);
      return;
    }
    setViewMonth((curr) => curr - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((curr) => curr + 1);
      return;
    }
    setViewMonth((curr) => curr + 1);
  };

  const content = (
    <View className="relative">
      <View className="absolute inset-0 translate-x-1.5 translate-y-2 rounded-[28px] bg-black/75" />
      <View className="rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <CustomText className="text-lg font-black text-black">{title}</CustomText>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onClose}
            className="rounded-xl border-[3px] border-black bg-white px-3 py-1"
          >
            <CustomText className="text-xs font-black text-black">Cerrar</CustomText>
          </TouchableOpacity>
        </View>

        <View className="mb-3 flex-row items-center justify-between rounded-xl border-[3px] border-black bg-white px-3 py-2">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={goPrevMonth}
          className="rounded-lg border-[2px] border-black bg-[#FFF7E8] px-3 py-1"
        >
          <CustomText className="text-xs font-black text-black">{'<'}</CustomText>
        </TouchableOpacity>

        <CustomText className="text-sm font-black text-black">{MONTHS[viewMonth]} {viewYear}</CustomText>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={goNextMonth}
          className="rounded-lg border-[2px] border-black bg-[#FFF7E8] px-3 py-1"
        >
          <CustomText className="text-xs font-black text-black">{'>'}</CustomText>
        </TouchableOpacity>
        </View>

        <View className="rounded-xl border-[3px] border-black bg-[#FFF7E8] p-2">
        <View className="mb-2 flex-row">
          {WEEKDAYS.map((weekday) => (
            <View key={weekday} className="flex-1 items-center py-1">
              <CustomText className="text-[11px] font-black text-[#6B5A4A]">{weekday}</CustomText>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {cells.map((cell) => {
            const isSelected = !!cell.dateIso && selectedDate === cell.dateIso;
            const isOccupied = !!cell.dateIso && occupiedSet.has(cell.dateIso);
            const isToday = !!cell.dateIso && todayIso === cell.dateIso;

            return (
              <View key={cell.key} className="mb-2 w-[14.28%] px-0.5">
                {cell.day === null ? (
                  <View className="h-10" />
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={!cell.dateIso || isOccupied}
                    onPress={() => {
                      if (cell.dateIso) {
                        onSelectDate(cell.dateIso);
                      }
                    }}
                    className={`h-10 items-center justify-center rounded-lg border-[2px] ${
                      isSelected
                        ? 'border-black bg-[#D7ECFF]'
                        : isOccupied
                          ? 'border-[#7A6857] bg-[#E5D2C9]'
                          : isToday
                            ? 'border-black bg-[#FFE7A8]'
                            : 'border-black bg-white'
                    }`}
                  >
                    <CustomText className={`text-xs font-black ${isOccupied ? 'text-[#7A6857]' : 'text-black'}`}>
                      {cell.day}
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center gap-3">
        <View className="flex-row items-center">
          <View className="mr-1 h-3 w-3 rounded border border-black bg-[#D7ECFF]" />
          <CustomText className="text-[11px] font-semibold text-[#6B5A4A]">Seleccionada</CustomText>
        </View>
        <View className="flex-row items-center">
          <View className="mr-1 h-3 w-3 rounded border border-black bg-[#E5D2C9]" />
          <CustomText className="text-[11px] font-semibold text-[#6B5A4A]">Encuentro existente</CustomText>
        </View>
        <View className="flex-row items-center">
          <View className="mr-1 h-3 w-3 rounded border border-black bg-[#FFE7A8]" />
          <CustomText className="text-[11px] font-semibold text-[#6B5A4A]">Hoy</CustomText>
        </View>
        </View>

        <CustomText className="mt-2 text-[11px] font-semibold text-[#6B5A4A]">
          Las fechas con encuentro existente no se pueden seleccionar para evitar duplicados.
        </CustomText>
      </View>
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
          zIndex: 2200,
        }}
      >
        <Pressable className="flex-1 bg-[#2E2016]/25" onPress={handleBackdropPress}>
          <View className="flex-1 items-center justify-center px-4 py-6">
            <Pressable
              onPress={() => {}}
              style={{ width: 420, maxWidth: '95%' }}
            >
              {content}
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-[#2E2016]/22" onPress={handleBackdropPress}>
        <View className="flex-1 justify-end px-2 pb-2">
          <Pressable onPress={() => {}}>
            {content}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
