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

// Component for notebook rules/lines
const NotebookLines = () => (
  <View className="absolute inset-0 overflow-hidden rounded-[34px] z-0 pointer-events-none">
    {/* Vertical pink margin line */}
    <View className="absolute top-0 bottom-0 left-10 w-[2px] bg-red-300/60" />
    <View className="absolute top-0 bottom-0 left-[42px] w-[1px] bg-red-300/30" />
    
    {/* Horizontal slight blue lines */}
    <View className="absolute inset-0 pt-20">
      {Array.from({ length: 15 }).map((_, i) => (
        <View key={`line-${i}`} className="w-full h-8 border-b border-blue-200/40" />
      ))}
    </View>
  </View>
);

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
    <View className="flex-1 bg-[#D2B48C]">
      <NotificationBar
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onClose={closeNotification}
      />

      <View className="flex-1 justify-center items-center px-4 pb-8 pt-12">
        <View className="w-full max-w-md">
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
          <View className="absolute inset-x-0 bottom-[-4px] translate-x-1.5 translate-y-1.5 h-full rounded-[34px] bg-black" />
          <View className="rounded-[34px] border-[4px] border-black bg-[#FDF9F1] px-6 pb-10 pt-12 min-h-[500px] overflow-hidden">
            <NotebookLines />
            
            {/* Main Content wrapper with z-index to stay above lines */}
            <View className="z-10 relative">
              <View className="absolute -top-14 right-4 z-40 items-center bg-[#FDF9F1] rounded-t-[34px] border-t-[4px] border-l-[4px] border-r-[4px] border-black px-2 pt-2 -rotate-[10deg] shadow-lg">
                <Text className="text-5xl">🐱</Text>
              </View>

              <Text className="text-[32px] font-black tracking-tighter text-[#1E140D] mt-2">
                Control de Notas
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
                      className="rounded-[20px] border-[3px] border-black bg-[#FF9EB1] px-5 py-3.5 items-center justify-center shadow-sm"
                    >
                      <Text className="text-[17px] font-black tracking-wide text-black shadow-black shadow-sm drop-shadow-sm">
                        {screen === 'login' ? 'Entrar a mi libreta' : 'Crear cuenta'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="mt-8 rounded-[16px] border-[3px] border-dashed border-[#A89481] bg-transparent px-4 py-3">
                    <Text className="text-center text-sm font-semibold text-[#7A6857]">
                      {screen === 'login' ? '¿Primera vez por aquí?' : '¿Ya tienes una cuenta creada?'}
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
              
              <View className="absolute -bottom-10 -left-6 z-40 items-center rotate-[15deg] opacity-90">
                <Text className="text-5xl">🪴</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
    </View>
  );
}