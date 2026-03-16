import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const iniciarSesion = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error al iniciar sesión', error.message);
    setLoading(false);
  };

  const registrarse = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Error de registro', error.message);
    else Alert.alert('¡Éxito!', 'Revisa tu correo para verificar la cuenta.');
    setLoading(false);
  };

  return (
    <View className="flex-1 justify-center items-center px-4 bg-gray-100 dark:bg-gray-950">
      <Text className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">
        Control de Notas
      </Text>

      <View className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
        <TextInput
          className="border-b border-gray-300 dark:border-gray-600 py-3 mb-5 text-base text-gray-800 dark:text-white"
          placeholder="Correo electrónico"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="border-b border-gray-300 dark:border-gray-600 py-3 mb-8 text-base text-gray-800 dark:text-white"
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : (
          <>
            <TouchableOpacity
              onPress={iniciarSesion}
              className="bg-blue-500 py-4 rounded-xl items-center mb-4 active:bg-blue-600"
            >
              <Text className="text-white font-bold text-base">Entrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={registrarse}
              className="py-4 items-center"
            >
              <Text className="text-blue-400 dark:text-blue-400 text-sm">Crear cuenta nueva</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}