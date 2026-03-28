import './global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, LogBox, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import RootNavigatorStack from './navigation/RootNavigatorStack';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

LogBox.ignoreLogs(['InteractionManager has been deprecated']);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    if ((Text as any).defaultProps == null) {
      (Text as any).defaultProps = {};
    }
    (Text as any).defaultProps.style = {
      ...(Text as any).defaultProps.style || {},
      fontFamily: 'Fredoka_400Regular',
    };

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('[APP] Session inicial:', currentSession ? 'autenticado' : 'no autenticado');
      setSession(currentSession);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[APP] Auth state change:', event, newSession ? 'autenticado' : 'no autenticado');
      setSession(newSession);
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C5A07D' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigatorStack session={session} />
    </NavigationContainer>
  );
}
