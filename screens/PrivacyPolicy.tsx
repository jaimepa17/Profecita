import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CustomText } from '../components/CustomText';
import { CatSticker } from '../components/CatSticker';

const PaperGrid = () => (
  <View className="absolute inset-0 overflow-hidden pointer-events-none">
    <View className="absolute inset-0 flex-row">
      {Array.from({ length: 22 }).map((_, i) => (
        <View key={`v-${i}`} className="h-full w-6 border-r border-[#DCCEC2]/60" />
      ))}
    </View>

    <View className="absolute inset-0">
      {Array.from({ length: 34 }).map((_, i) => (
        <View key={`h-${i}`} className="w-full h-6 border-b border-[#DCCEC2]/60" />
      ))}
    </View>
  </View>
);

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-[#FDF9F1]">
      <View className="absolute inset-0">
        <PaperGrid />
      </View>

      <View className="bg-[#FFD98E] px-4 py-3 border-b-4 border-black">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-2"
        >
          <View className="rotate-180">
            <CatSticker size={28} />
          </View>
          <CustomText className="text-xl font-black text-black">Política de Privacidad</CustomText>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="relative">
          <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-[24px] bg-black" />
          <View className="relative rounded-[20px] border-[3px] border-black bg-[#FFF7E8] p-5">
            <View className="gap-4">
              <View>
                <CustomText className="text-2xl font-black text-black">
                  Política de Privacidad
                </CustomText>
                <CustomText className="text-sm font-bold text-[#7A6857] mt-1">
                  Fecha de última actualización: Abril 2026
                </CustomText>
              </View>

              <CustomText className="text-base font-semibold leading-6 text-[#5F5146]">
                En Profecita, valoramos y respetamos tu privacidad. Esta política describe cómo recopilamos, usamos y protegemos tu información personal.
              </CustomText>

              <View className="border-t-2 border-[#DCCEC2] pt-4">
                <CustomText className="text-lg font-black text-black mb-2">
                  1. Información que recopilamos
                </CustomText>
                <CustomText className="text-sm font-semibold leading-6 text-[#5F5146]">
                  • Correo electrónico y contraseña para autenticación{'\n'}
                  • Datos académicos (años, asignaturas, grupos, estudiantes, notas){'\n'}
                  • Información de uso de la aplicación
                </CustomText>
              </View>

              <View className="border-t-2 border-[#DCCEC2] pt-4">
                <CustomText className="text-lg font-black text-black mb-2">
                  2. Cómo usamos tu información
                </CustomText>
                <CustomText className="text-sm font-semibold leading-6 text-[#5F5146]">
                  • Proporcionarte acceso a la plataforma educativa{'\n'}
                  • Gestionar y almacenar tus datos académicos{'\n'}
                  • Mejorar y personalizar tu experiencia en la app{'\n'}
                  • Comunicarte sobre actualizaciones importantes
                </CustomText>
              </View>

              <View className="border-t-2 border-[#DCCEC2] pt-4">
                <CustomText className="text-lg font-black text-black mb-2">
                  3. Almacenamiento y seguridad
                </CustomText>
                <CustomText className="text-sm font-semibold leading-6 text-[#5F5146]">
                  Utilizamos Supabase como nuestro proveedor de infraestructura y almacenamiento. Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos contra accesos no autorizados, pérdida o manipulación.
                </CustomText>
              </View>

              <View className="border-t-2 border-[#DCCEC2] pt-4">
                <CustomText className="text-lg font-black text-black mb-2">
                  4. Compartición de datos
                </CustomText>
                <CustomText className="text-sm font-semibold leading-6 text-[#5F5146]">
                  No vendemos, alquilamos ni compartimos tus datos personales con terceros con fines comerciales. Tus datos solo son accesibles por ti y, en su caso, por administradores de la institución educativa.
                </CustomText>
              </View>

              <View className="border-t-2 border-[#DCCEC2] pt-4">
                <CustomText className="text-lg font-black text-black mb-2">
                  5. Tus derechos
                </CustomText>
                <CustomText className="text-sm font-semibold leading-6 text-[#5F5146]">
                  Tienes derecho a:{'\n'}
                  • Acceder a tus datos personales{'\n'}
                  • Solicitar corrección de datos incorrectos{'\n'}
                  • Solicitar eliminación de tu cuenta y datos{'\n'}
                  • Revocar tu consentimiento en cualquier momento
                </CustomText>
              </View>

              <View className="border-t-2 border-[#DCCEC2] pt-4">
                <CustomText className="text-lg font-black text-black mb-2">
                  6. Contacto
                </CustomText>
                <CustomText className="text-sm font-semibold leading-6 text-[#5F5146]">
                  Si tienes preguntas sobre esta política o deseas ejercer tus derechos, contacta a través del correo de soporte de la aplicación.
                </CustomText>
              </View>

              <View className="border-t-2 border-[#DCCEC2] pt-4 mt-2">
                <CustomText className="text-xs font-bold text-[#7A6857] text-center">
                  Al usar Profecita, aceptas los términos descritos en esta política.
                </CustomText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
