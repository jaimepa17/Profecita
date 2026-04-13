import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { signInWithEmail, signUpWithEmail } from '@/lib/authLogic';
import NotificationBar from '@/components/NotificationBar';
import PrivacyPolicyCard from '@/components/PrivacyPolicyCard';
import { checkSupabaseAuthHealth } from '@/lib/serviceMonitor';
import { useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { BasketSticker } from '@/components/BasketSticker';
import { PlantSticker } from '@/components/PlantSticker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

type NotificationType = 'success' | 'warning' | 'error';

type NotificationState = {
  visible: boolean;
  type: NotificationType;
  message: string;
};

const PaperGrid = () => (
  <View className="absolute inset-0 overflow-hidden rounded-[36px] z-0 pointer-events-none">
    <View className="absolute inset-0 flex-row">
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={`v-${i}`} className="h-full w-6 border-r border-[#DCCEC2]/60" />
      ))}
    </View>

    <View className="absolute inset-0">
      {Array.from({ length: 26 }).map((_, i) => (
        <View key={`h-${i}`} className="w-full h-6 border-b border-[#DCCEC2]/60" />
      ))}
    </View>
  </View>
);

export default function Auth() {
  const navigation = useNavigation<NavigationProp>();
  const [screen, setScreen] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyModalShowAccept, setPolicyModalShowAccept] = useState(true);
  const { run: runAuthAction, isRunning: loading } = useSingleFlight();
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    type: 'warning',
    message: '',
  });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = (type: NotificationType, message: string, durationMs = 5000) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setNotification({ visible: true, type, message });
    hideTimerRef.current = setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }));
      hideTimerRef.current = null;
    }, durationMs);
  };

  const closeNotification = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    let isMounted = true;

    const runHealthCheck = async () => {
      const health = await checkSupabaseAuthHealth();
      if (!isMounted || health.ok) {
        return;
      }

      if (health.severity === 'critical' && !__DEV__) {
        return;
      }

      const baseMessage = health.message ?? 'Hay problemas con el servicio de autenticación.';
      const debugPart = __DEV__ && health.debugMessage ? `\nDetalle: ${health.debugMessage}` : '';
      showNotification(
        health.severity === 'critical' ? 'error' : 'warning',
        `${baseMessage}${debugPart}`,
        6500
      );
    };

    const firstCheckTimer = setTimeout(runHealthCheck, 12000);
    const intervalId = setInterval(runHealthCheck, 60000);

    return () => {
      isMounted = false;
      clearTimeout(firstCheckTimer);
      clearInterval(intervalId);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const iniciarSesion = async () => {
    await runAuthAction(async () => {
      const result = await signInWithEmail(email, password);
      if (!result.ok) {
        const debugPart = __DEV__ && result.debugMessage ? `\nDetalle: ${result.debugMessage}` : '';
        showNotification(
          'error',
          `${result.message ?? 'No se pudo iniciar sesión.'}${debugPart}`,
          7000
        );
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    });
  };

  const submitRegistro = async () => {
    await runAuthAction(async () => {
      const result = await signUpWithEmail(email, password, confirmPassword);

      if (!result.ok) {
        const debugPart = __DEV__ && result.debugMessage ? `\nDetalle: ${result.debugMessage}` : '';
        showNotification(
          'error',
          `${result.message ?? 'No se pudo crear la cuenta.'}${debugPart}`,
          7000
        );
        return;
      }

      showNotification('success', result.message ?? 'Registro exitoso.', 5500);
      setConfirmPassword('');
      setScreen('login');
    });
  };

  const registrarse = async () => {
    const hasEmail = email.trim().length > 0;
    const hasPassword = password.length > 0;
    const hasConfirmPassword = confirmPassword.length > 0;

    if (!hasEmail || !hasPassword || !hasConfirmPassword) {
      showNotification('warning', 'Completa todos los campos del registro.', 4500);
      return;
    }

    setPolicyModalShowAccept(true);
    setPolicyModalVisible(true);
  };

  const aceptarPoliticaYRegistrar = async () => {
    setPolicyModalVisible(false);
    await submitRegistro();
  };

  const goToSignup = () => {
    setPassword('');
    setConfirmPassword('');
    setPolicyModalVisible(false);
    setScreen('signup');
  };

  const goToLogin = () => {
    setPassword('');
    setConfirmPassword('');
    setPolicyModalVisible(false);
    setScreen('login');
  };

  const title = screen === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta';

  return (
    <View className="flex-1 bg-[#C5A07D]">
      <NotificationBar
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={closeNotification}
      />

      <View className="flex-1 justify-center items-center px-4 pb-8 pt-12">
        <View className="w-full max-w-md">
        <View className="relative mt-4">
          <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
          <View className="rounded-[36px] border-[4px] border-black bg-[#F7F0E4] px-6 pb-10 pt-12 min-h-[560px] overflow-hidden">
            <PaperGrid />
            
            {/* Main Content wrapper with z-index to stay above lines */}
            <View className="z-10 relative">
              <View className="absolute -top-16 right-2 z-40 items-center bg-[#F7F0E4] rounded-[20px] px-2 pt-1 -rotate-[8deg]">
                <BasketSticker size={52} />
              </View>

              <Text className="text-[32px] font-black tracking-tighter text-[#1E140D] mt-2 text">
               Bienvenido a Profecita 
              </Text>
              <Text className="mt-1 text-lg font-bold text-[#5E5045]">{title}</Text>
              <Text className="mt-1 mb-6 text-sm leading-5 font-semibold text-[#8A7968]">
                Entra a tu libreta bonita y organiza tus clases con calma.
              </Text>

              <View className="mt-2 gap-5">
                <View className="relative">
                  <View className="absolute inset-0 rounded-[20px] bg-black translate-x-1 translate-y-1" />
                  <View className="rounded-[20px] border-[3px] border-black bg-white px-4 py-3">
                    <Text className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-[#7A6857]">
                      Correo electrónico
                    </Text>
                    <TextInput
                      className="text-base font-bold text-black"
                      placeholder="profe@correo.com"
                      placeholderTextColor="#9f8b78"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </View>
                </View>

                <View className="relative">
                  <View className="absolute inset-0 rounded-[20px] bg-black translate-x-1 translate-y-1" />
                  <View className="rounded-[20px] border-[3px] border-black bg-white px-4 py-3">
                    <Text className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-[#7A6857]">
                      Contraseña
                    </Text>
                    <TextInput
                      className="text-base font-bold text-black"
                      placeholder="Tu contraseña"
                      placeholderTextColor="#9f8b78"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                </View>

                {screen === 'signup' ? (
                  <View className="relative">
                    <View className="absolute inset-0 rounded-[20px] bg-black translate-x-1 translate-y-1" />
                    <View className="rounded-[20px] border-[3px] border-black bg-white px-4 py-3">
                      <Text className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-[#7A6857]">
                        Confirmar contraseña
                      </Text>
                      <TextInput
                        className="text-base font-bold text-black"
                        placeholder="Repite tu contraseña"
                        placeholderTextColor="#9f8b78"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        editable={!loading}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              {loading ? (
                <View className="mt-8 items-center">
                  <ActivityIndicator size="large" color="#000000" />
                  <Text className="mt-3 text-sm font-bold text-[#5E5045]">
                    Preparando tu libreta...
                  </Text>
                </View>
              ) : (
                <>
                  <View className="relative mt-8">
                    <View className="absolute inset-0 rounded-[20px] bg-black translate-x-1 translate-y-1" />
                    <TouchableOpacity
                      onPress={screen === 'login' ? iniciarSesion : registrarse}
                      activeOpacity={0.8}
                      disabled={loading}
                      className="rounded-[20px] border-[3px] border-black px-5 py-3.5 items-center justify-center bg-[#F8A9B7]"
                    >
                      <Text className="text-[17px] font-black tracking-wide text-black">
                        {screen === 'login' ? 'Entrar a mi libreta' : 'Crear cuenta'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="mt-8 rounded-[16px] border-[3px] border-dashed border-[#A89481] bg-transparent px-4 py-3">
                    <Text className="text-center text-sm font-semibold text-[#7A6857]">
                      {screen === 'login' ? '¿Primera vez por aquí?' : '¿Ya tienes una cuenta creada?'}
                    </Text>

                    {screen === 'login' ? (
                      <TouchableOpacity
                        onPress={goToSignup}
                        disabled={loading}
                        className="mt-2 items-center"
                      >
                        <Text className="text-sm font-black text-black">Crear cuenta nueva</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={goToLogin}
                        disabled={loading}
                        className="mt-2 items-center"
                      >
                        <Text className="text-sm font-black text-black">
                          Ya tengo cuenta, iniciar sesión
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {screen === 'login' ? (
                    <Text className="mt-4 text-center text-xs font-semibold text-[#8A7968]">
                      Al usar esta app, aceptas nuestra{' '}
                      <Text
                        className="underline font-bold text-[#5E5045]"
                        onPress={() => {
                          setPolicyModalShowAccept(false);
                          setPolicyModalVisible(true);
                        }}
                      >
                        política de privacidad
                      </Text>
                      .
                    </Text>
                  ) : null}
                </>
              )}

              <PrivacyPolicyCard
                visible={policyModalVisible}
                onAccept={policyModalShowAccept ? aceptarPoliticaYRegistrar : () => setPolicyModalVisible(false)}
                onClose={() => setPolicyModalVisible(false)}
                showAccept={policyModalShowAccept}
              />
              
              <View className="absolute -bottom-12 -left-3 z-40 items-center rotate-[16deg] opacity-95">
                <PlantSticker size={52} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
    </View>
  );
}
