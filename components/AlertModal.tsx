import { Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

export type AlertModalType = 'success' | 'error' | 'warning' | 'info';

export type AlertModalPayload = {
  type: AlertModalType;
  title: string;
  message: string;
  buttonLabel?: string;
};

type AlertModalProps = {
  visible: boolean;
  payload: AlertModalPayload;
  onClose: () => void;
};

const iconByType: Record<AlertModalType, string> = {
  success: '✓',
  error: '!',
  warning: '⚠',
  info: 'i',
};

const chipByType: Record<AlertModalType, string> = {
  success: 'bg-[#BDE9C7]',
  error: 'bg-[#FFC9C2]',
  warning: 'bg-[#FFD98E]',
  info: 'bg-[#D7ECFF]',
};

const buttonByType: Record<AlertModalType, string> = {
  success: 'bg-[#BDE9C7]',
  error: 'bg-[#FFC9C2]',
  warning: 'bg-[#FFD98E]',
  info: 'bg-[#D7ECFF]',
};

export default function AlertModal({ visible, payload, onClose }: AlertModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/35" onPress={onClose}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable className="w-full max-w-md rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5">
            <View className="relative">
              <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-[20px] bg-black" />
              <View className="rounded-[20px] border-[3px] border-black bg-[#FFF7E8] px-4 py-4">
                <View className="flex-row items-center gap-2">
                  <View
                    className={`h-8 w-8 items-center justify-center rounded-full border-[3px] border-black ${chipByType[payload.type]}`}
                  >
                    <CustomText className="text-base font-black text-black">{iconByType[payload.type]}</CustomText>
                  </View>
                  <CustomText className="flex-1 text-xl font-black text-black">{payload.title}</CustomText>
                </View>

                <CustomText className="mt-3 text-sm font-semibold leading-5 text-[#5F5146]">
                  {payload.message}
                </CustomText>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={onClose}
              className={`mt-4 rounded-xl border-[3px] border-black px-4 py-3 ${buttonByType[payload.type]}`}
            >
              <CustomText className="text-center text-sm font-black text-black">
                {payload.buttonLabel ?? 'Entendido'}
              </CustomText>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
