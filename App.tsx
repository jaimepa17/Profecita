import './global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import RootNavigatorStack from './navigation/RootNavigatorStack';
import { useFonts } from 'expo-font';
import { Fredoka_400Regular, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { initDataPrefetch, resetDataPrefetch } from '@/lib/services/dataPrefetchService';

LogBox.ignoreLogs(['InteractionManager has been deprecated']);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Fredoka: Fredoka_400Regular,
    'Fredoka-Bold': Fredoka_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('[APP] Session inicial:', currentSession ? 'autenticado' : 'no autenticado');
      setSession(currentSession);
      setSessionLoading(false);

      // Iniciar precarga de datos en background cuando hay sesión
      if (currentSession?.user?.id) {
        void initDataPrefetch(currentSession.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[APP] Auth state change:', event, newSession ? 'autenticado' : 'no autenticado');
      setSession(newSession);

      if (newSession?.user?.id) {
        // Reiniciar precarga al cambiar de usuario o iniciar sesión
        resetDataPrefetch();
        void initDataPrefetch(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetDataPrefetch();
      }
    });

    return () => {
      if (listener && typeof listener.subscription?.unsubscribe === 'function') {
        try {
          listener.subscription.unsubscribe();
        } catch (_) {}
      }
    };
  }, [fontsLoaded]);

  if (!fontsLoaded || sessionLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C5A07D' }}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <RootNavigatorStack session={session} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}