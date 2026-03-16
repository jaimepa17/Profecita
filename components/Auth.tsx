import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { signInWithEmail, signUpWithEmail } from '@/lib/authLogic';
import NotificationBar from '@/components/NotificationBar';
import { checkSupabaseAuthHealth } from '@/lib/serviceMonitor';

type NotificationType = 'success' | 'warning' | 'error';

type NotificationState = {
  visible: boolean;
  type: NotificationType;
  message: string;
};

export default function Auth() {
  const [screen, setScreen] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const result = await signInWithEmail(email, password);
    if (!result.ok) {
      const debugPart = __DEV__ && result.debugMessage ? `\nDetalle: ${result.debugMessage}` : '';
      showNotification(
        'error',
        `${result.message ?? 'No se pudo iniciar sesión.'}${debugPart}`,
        7000
      );
    }
    setLoading(false);
  };

  const registrarse = async () => {
    setLoading(true);
    const result = await signUpWithEmail(email, password, confirmPassword);

    if (!result.ok) {
      const debugPart = __DEV__ && result.debugMessage ? `\nDetalle: ${result.debugMessage}` : '';
      showNotification(
        'error',
        `${result.message ?? 'No se pudo crear la cuenta.'}${debugPart}`,
        7000
      );
      setLoading(false);
      return;
    }

    showNotification('success', result.message ?? 'Registro exitoso.', 5500);
    setConfirmPassword('');
    setScreen('login');
    setLoading(false);
  };

  const goToSignup = () => {
    setPassword('');
    setConfirmPassword('');
    setScreen('signup');
  };

  const goToLogin = () => {
    setPassword('');
    setConfirmPassword('');
    setScreen('login');
  };

  const title = screen === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta';

  return (
    <View className="flex-1 bg-[#AF8F76]">
      <NotificationBar
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={closeNotification}
      />

      <View className="flex-1 justify-center px-4 pb-8 pt-12">
        <View className="mb-4 flex-row items-start justify-between px-1">
          <View className="relative flex-1 pr-3">
            <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black" />
            <View className="h-14 rounded-full border-[3px] border-black bg-[#FDF9F1]" />
          </View>

          <View className="relative mr-1 mt-1">
            <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-full bg-black" />
            <View className="h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-[#FDF9F1]">
              <Text className="text-2xl">✂️</Text>
            </View>
          </View>
        </View>

        <View className="relative mt-4">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[34px] bg-black" />
          <View className="rounded-[34px] border-[4px] border-black bg-[#FDF9F1] px-5 pb-8 pt-16">
            <View className="absolute -top-12 right-6 z-10 items-center">
              <Text className="text-6xl">🐱</Text>
            </View>

            <Text className="text-3xl font-black text-[#1E140D]">Control de Notas</Text>
            <Text className="mt-2 text-base font-medium text-[#5E5045]">{title}</Text>
            <Text className="mt-1 text-sm leading-5 text-[#7A6857]">
              Entra a tu libreta bonita y organiza tus clases con calma.
            </Text>

            <View className="mt-6 gap-4">
              <View className="rounded-[24px] border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                  Correo electrónico
                </Text>
                <TextInput
                  className="text-base font-medium text-black"
                  placeholder="profe@correo.com"
                  placeholderTextColor="#9f8b78"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View className="rounded-[24px] border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                  Contraseña
                </Text>
                <TextInput
                  className="text-base font-medium text-black"
                  placeholder="Tu contraseña"
                  placeholderTextColor="#9f8b78"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {screen === 'signup' ? (
                <View className="rounded-[24px] border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                    Confirmar contraseña
                  </Text>
                  <TextInput
                    className="text-base font-medium text-black"
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#9f8b78"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
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
                <TouchableOpacity
                  onPress={screen === 'login' ? iniciarSesion : registrarse}
                  activeOpacity={0.9}
                  className="mt-7 rounded-[24px] border-[3px] border-black bg-[#FFB6C9] px-5 py-4"
                >
                  <Text className="text-center text-base font-black text-black">
                    {screen === 'login' ? 'Entrar a mi libreta' : 'Crear cuenta'}
                  </Text>
                </TouchableOpacity>

                <View className="mt-4 rounded-[22px] border-[3px] border-dashed border-black bg-[#F7E7C6] px-4 py-3">
                  <Text className="text-center text-sm font-medium text-[#5E5045]">
                    {screen === 'login'
                      ? '¿Primera vez por aquí?'
                      : '¿Ya tienes una cuenta creada?'}
                  </Text>

                  {screen === 'login' ? (
                    <TouchableOpacity onPress={goToSignup} className="mt-2 items-center">
                      <Text className="text-sm font-black text-black">Crear cuenta nueva</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={goToLogin} className="mt-2 items-center">
                      <Text className="text-sm font-black text-black">
                        Ya tengo cuenta, iniciar sesión
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}