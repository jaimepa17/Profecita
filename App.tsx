import './global.css';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!session && session !== undefined) {
    return <Auth />;
  }

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 dark:bg-gray-950 px-6">
      <StatusBar style="auto" />
      <Text className="text-2xl font-bold mb-3 text-gray-800 dark:text-white">
        ¡Bienvenida, profa!
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 mb-8 text-base">
        {session?.user.email}
      </Text>
      <TouchableOpacity
        onPress={() => supabase.auth.signOut()}
        className="bg-red-500 px-8 py-3 rounded-lg active:bg-red-600"
      >
        <Text className="text-white font-bold text-base">Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}