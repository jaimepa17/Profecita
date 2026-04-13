import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type SelectOption = {
  id: string;
  label: string;
  description?: string;
};

type SelectOptionModalProps = {
  visible: boolean;
  title: string;
  emptyMessage: string;
  options: SelectOption[];
  selectedId?: string | null;
  selectedIds?: string[];
  multiSelect?: boolean;
  onClose: () => void;
  onSelect: (option: SelectOption) => void;
};

export default function SelectOptionModal({
  visible,
  title,
  emptyMessage,
  options,
  selectedId,
  selectedIds,
  multiSelect = false,
  onClose,
  onSelect,
}: SelectOptionModalProps) {
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
                <CustomText className="text-2xl font-black text-black">{title}</CustomText>
                <CustomText className="mt-2 text-sm font-medium text-[#6B5A4A]">
                  Selecciona una opción para continuar.
                </CustomText>
              </View>
            </View>

            {options.length === 0 ? (
              <View className="rounded-2xl border-[3px] border-black bg-white px-4 py-4">
                <CustomText className="text-center text-sm font-bold text-[#7A6857]">{emptyMessage}</CustomText>
              </View>
            ) : (
              <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {options.map((option) => {
                    const isSelected = multiSelect
                      ? (selectedIds ?? []).includes(option.id)
                      : selectedId === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        accessibilityRole="button"
                        activeOpacity={0.9}
                        onPress={() => onSelect(option)}
                        className={`rounded-2xl border-[3px] px-4 py-3 ${
                          isSelected
                            ? 'border-black bg-[#FFD98E]'
                            : 'border-black bg-white'
                        }`}
                      >
                        <CustomText className="text-base font-black text-black">
                          {multiSelect ? `${isSelected ? '✓ ' : ''}${option.label}` : option.label}
                        </CustomText>
                        {option.description ? (
                          <CustomText className="mt-1 text-xs font-semibold text-[#6B5A4A]">
                            {option.description}
                          </CustomText>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={onClose}
              className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-4"
            >
              <CustomText className="text-center text-sm font-black text-black">Cerrar</CustomText>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
