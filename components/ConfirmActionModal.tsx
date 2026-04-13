import { Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type ConfirmActionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/35" onPress={onCancel}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable className="w-full max-w-md rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5">
            <View className="relative">
              <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-[20px] bg-black" />
              <View className="rounded-[20px] border-[3px] border-black bg-[#FFF7E8] px-4 py-4">
                <CustomText className="text-xl font-black text-black">{title}</CustomText>
                <CustomText className="mt-2 text-sm font-semibold leading-5 text-[#5F5146]">
                  {message}
                </CustomText>
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={onCancel}
                disabled={loading}
                className="flex-1 rounded-xl border-[3px] border-black bg-white px-4 py-3"
              >
                <CustomText className="text-center text-sm font-black text-black">{cancelLabel}</CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={onConfirm}
                disabled={loading}
                className="flex-1 rounded-xl border-[3px] border-black bg-[#FFC9C2] px-4 py-3"
              >
                <CustomText className="text-center text-sm font-black text-black">
                  {loading ? 'Procesando...' : confirmLabel}
                </CustomText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
