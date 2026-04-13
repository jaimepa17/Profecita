import { Linking, Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';

type PrivacyPolicyCardProps = {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
  /**
   * If false, hides the accept button and leaves the modal as read-only view.
   * Use for showing policies from login without requiring acceptance.
   */
  showAccept?: boolean;
  policyUrl?: string;
};

const defaultPolicyUrl = 'https://www.example.com/politica-de-privacidad';

export default function PrivacyPolicyCard({
  visible,
  onAccept,
  onClose,
  showAccept = true,
  policyUrl,
}: PrivacyPolicyCardProps) {

  const openPolicy = async () => {
    const url = policyUrl ?? defaultPolicyUrl;
    try {
      await Linking.openURL(url);
    } catch {
      // sincrónico: puede ignorarse si no se puede abrir
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="w-full max-w-md rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5">
            <View className="relative">
              <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-[20px] bg-black" />
              <View className="rounded-[20px] border-[3px] border-black bg-[#FFF7E8] px-4 py-4">
                <CustomText className="text-xl font-black text-black">Política de Privacidad</CustomText>
                <CustomText className="mt-1 text-xs font-semibold text-[#7A6857]">
                  Resumen claro para el registro en Profecita.
                </CustomText>

                <ScrollView className="mt-3 max-h-64" showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    <CustomText className="text-sm font-semibold leading-5 text-[#5F5146]">
                      • Solo pedimos los datos necesarios para autenticarte (correo y contraseña).
                    </CustomText>
                    <CustomText className="text-sm font-semibold leading-5 text-[#5F5146]">
                      • Usamos Supabase para almacenamiento seguro y funcionamiento de la app.
                    </CustomText>
                    <CustomText className="text-sm font-semibold leading-5 text-[#5F5146]">
                      • No vendemos tus datos ni los compartimos con terceros fuera del servicio.
                    </CustomText>
                    <CustomText className="text-sm font-semibold leading-5 text-[#5F5146]">
                      • Puedes solicitar acceso, corrección o eliminación de tu cuenta.
                    </CustomText>
                    <CustomText className="text-sm font-semibold leading-5 text-[#5F5146]">
                      • Al aceptar, autorizas el tratamiento de datos para usar esta plataforma educativa.
                    </CustomText>
                  </View>
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="link"
              activeOpacity={0.9}
              onPress={openPolicy}
              className="mt-4 rounded-xl border-[3px] border-black bg-white px-4 py-3"
            >
              <CustomText className="text-center text-sm font-black text-black">Leer política completa</CustomText>
            </TouchableOpacity>

            <View className="mt-3 flex-row gap-3">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={onClose}
                className="flex-1 rounded-xl border-[3px] border-black bg-white px-4 py-3"
              >
                <CustomText className="text-center text-sm font-black text-black">Cerrar</CustomText>
              </TouchableOpacity>

              {showAccept ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  onPress={onAccept}
                  className="flex-1 rounded-xl border-[3px] border-black bg-[#FFD98E] px-4 py-3"
                >
                  <CustomText className="text-center text-sm font-black text-black">Aceptar y continuar</CustomText>
                </TouchableOpacity>
              ) : null}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
