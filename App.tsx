import './global.css';
import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './screens/Auth';
import Home from './screens/Home';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    // Apply global default font for React Native Text components once
    if ((Text as any).defaultProps == null) {
      (Text as any).defaultProps = {};
    }
    (Text as any).defaultProps.style = {
      ...(Text as any).defaultProps.style || {},
      fontFamily: 'Fredoka_400Regular',
    };

    // Supabase session initialization and listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      // remove listener if available
      if (listener && typeof listener.subscription?.unsubscribe === 'function') {
        try { listener.subscription.unsubscribe(); } catch (_) {}
      }
    };
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C5A07D' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!session && session !== undefined) {
    return <Auth />;
  }

  return <Home userEmail={session?.user?.email} />;
}