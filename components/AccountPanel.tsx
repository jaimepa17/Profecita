import { View, TouchableOpacity } from 'react-native';
import { CustomText } from './CustomText';
import { CatAvatar } from './CatAvatar';
import BottomSheetModal from './BottomSheetModal';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  onChangeAccount: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  userEmail?: string;
};

export default function AccountPanel({
  visible,
  onRequestClose,
  onChangeAccount,
  onSignOut,
  signingOut,
  userEmail,
}: Props) {
  return (
    <BottomSheetModal visible={visible} onRequestClose={onRequestClose} title="Mi cuenta">
      <View className="relative mb-5">
        <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[30px] bg-black" />
        <View className="rounded-[30px] border-[3px] border-black bg-[#FFF7E8] p-5">
          <View className="flex-row items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FDF9F1]">
              <CatAvatar size={48} />
            </View>

            <View className="ml-4 flex-1">
              <CustomText className="text-2xl font-black text-black">Mi cuenta</CustomText>
              <CustomText className="mt-1 text-base font-semibold text-[#5E5045]">
                {userEmail ?? 'Usuario autenticado'}
              </CustomText>
              <CustomText className="mt-2 text-sm font-medium text-[#7A6857]">
                Avatar provisional. Luego podrás subir tu foto.
              </CustomText>
            </View>
          </View>
        </View>
      </View>

      <View className="relative mb-4">
        <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-black" />
        <View className="rounded-[28px] border-[3px] border-black bg-[#F7E7C6] p-5">
          <CustomText className="text-xs font-bold uppercase tracking-wide text-[#6B5747]">
            Opciones de cuenta
          </CustomText>

          <View className="mt-4 gap-3">
            <View className="rounded-2xl border-[3px] border-black bg-[#D9F2C7] px-4 py-4">
              <CustomText className="text-base font-black text-black">Perfil del profesor</CustomText>
              <CustomText className="mt-1 text-sm font-medium text-[#4C5B42]">
                Visualiza tu nombre, correo y futura foto de perfil.
              </CustomText>
            </View>

            <View className="rounded-2xl border-[3px] border-black bg-[#D7ECFF] px-4 py-4">
              <CustomText className="text-base font-black text-black">Configuraciones avanzadas</CustomText>
              <CustomText className="mt-1 text-sm font-medium text-[#44596A]">
                Apariencia, notificaciones, seguridad y preferencias. Solo visual por ahora.
              </CustomText>
            </View>

            <View className="rounded-2xl border-dashed border-black bg-[#FFE7BD] px-4 py-4">
              <CustomText className="text-base font-black text-black">Próximamente</CustomText>
              <CustomText className="mt-1 text-sm font-medium text-[#6E5735]">
                Cambiar avatar, editar nombre y administrar sesiones activas.
              </CustomText>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          disabled={signingOut}
          onPress={onChangeAccount}
          activeOpacity={0.9}
          className="flex-1 rounded-2xl border-[3px] border-black bg-[#A7D8FF] px-4 py-4"
        >
          <CustomText className="text-center text-sm font-black text-black">
            {signingOut ? 'Procesando...' : 'Cambiar cuenta'}
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={signingOut}
          onPress={onSignOut}
          activeOpacity={0.9}
          className="flex-1 rounded-2xl border-[3px] border-black bg-[#FFC9C2] px-4 py-4"
        >
          <CustomText className="text-center text-sm font-black text-black">Cerrar sesión</CustomText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.9}
        onPress={onRequestClose}
        className="mt-4 self-center rounded-full border-[3px] border-black bg-white px-5 py-2"
      >
        <CustomText className="text-sm font-black text-black">Cerrar panel</CustomText>
      </TouchableOpacity>
    </BottomSheetModal>
  );
}
