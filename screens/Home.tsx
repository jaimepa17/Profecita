import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AccountPanel from '../components/AccountPanel';
import { supabase } from '@/lib/supabase';

type Carrera = {
  id: string | number;
  nombre?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type HomeProps = {
  userEmail?: string;
};

const PaperGrid = () => (
  <View className="absolute inset-0 overflow-hidden rounded-[34px] pointer-events-none">
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

export default function Home({ userEmail }: HomeProps) {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [accountPanelVisible, setAccountPanelVisible] = useState(false);

  const cerrarSesion = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('No se pudo cerrar sesión', error.message);
    }
    setSigningOut(false);
  };

  const cambiarCuenta = () => {
    setAccountPanelVisible(false);
    Alert.alert(
      'Cambiar de cuenta',
      'Se cerrará la sesión actual para iniciar con otra cuenta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: cerrarSesion,
        },
      ]
    );
  };

  const openAccountPanel = () => {
    setAccountPanelVisible(true);
  };

  const closeAccountPanel = () => {
    setAccountPanelVisible(false);
  };

  useEffect(() => {
    const cargarCarreras = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('carreras')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('No se pudieron cargar las carreras', error.message);
      }

      setCarreras((data as Carrera[]) ?? []);
      setLoading(false);
    };

    cargarCarreras();
  }, []);

  const renderCarrera = ({ item, index }: { item: Carrera; index: number }) => {
    const titulo =
      (typeof item.nombre === 'string' && item.nombre.trim()) ||
      `Carrera ${index + 1}`;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.9}
        className="mb-5"
      >
        <View className="relative">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-black" />
          <View className="rounded-[28px] border-[3px] border-black bg-[#FDF9F1] p-6">
            <View className="mb-4 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-black text-black">{titulo}</Text>
                <Text className="mt-2 text-sm font-medium text-[#6B5A4A]">
                  Programa académico
                </Text>
              </View>

              <View className="rounded-full border-[3px] border-black bg-[#FFD9A0] px-3 py-2">
                <Text className="text-xs font-black text-black">CLASE</Text>
              </View>
            </View>

            <View className="rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Fecha de creación
              </Text>
              <Text className="mt-1 text-base font-semibold text-black">
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString('es-ES')
                  : 'Fecha no disponible'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View className="mb-6">
      <View className="mb-5 flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-4xl font-black text-[#1E140D]">¡Hola, Profe!</Text>
          <Text className="mt-2 text-base font-medium text-[#3A2B20]">
            Organiza tus carreras como en una libreta bonita.
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={openAccountPanel}
          className="relative"
        >
          <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-full bg-black" />
          <View className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FDF9F1]">
            <Text className="text-3xl">🐱</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="self-start rounded-full border-[3px] border-black bg-[#FDF9F1] px-5 py-2">
        <Text className="text-sm font-black text-black">Mis Carreras</Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View className="mt-8 items-center justify-center px-1">
      <View className="relative w-full">
        <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[32px] bg-black" />
        <View className="items-center rounded-[32px] border-[3px] border-black bg-[#FDF9F1] px-6 py-10">
          <Text className="text-5xl">📒</Text>
          <Text className="mt-4 text-center text-2xl font-black text-black">
            Tu libreta está vacía
          </Text>
          <Text className="mt-3 text-center text-base font-medium leading-6 text-[#5F5146]">
            ¡Agrega tu primera clase y empieza a organizar tus programas académicos!
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            className="mt-6 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-6 py-4"
          >
            <Text className="text-base font-black text-black">
              + Agregar Nueva Carrera
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#C5A07D] px-6">
        <View className="absolute left-6 right-6 top-16 bottom-16 rounded-[36px] border-[3px] border-black bg-[#FDF9F1]" />
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base font-bold text-[#1E140D]">Cargando tu libreta...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-10 pb-4">
      <AccountPanel
        visible={accountPanelVisible}
        onRequestClose={closeAccountPanel}
        onChangeAccount={cambiarCuenta}
        onSignOut={cerrarSesion}
        signingOut={signingOut}
        userEmail={userEmail}
      />

      <View className="mb-4 flex-row items-end justify-between px-1">
        <View className="relative flex-1 pr-3">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black" />
          <View className="h-14 rounded-full border-[3px] border-black bg-[#EFE7DC]" />
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 rounded-[34px] border-[4px] border-black bg-[#F7F0E4] overflow-hidden">
          <PaperGrid />

          <FlatList
            data={carreras}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderCarrera}
            ListHeaderComponent={Header}
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 38,
              paddingBottom: 120,
              flexGrow: 1,
            }}
          />

          <View className="absolute -bottom-4 -right-2 rotate-[-16deg]">
            <Text className="text-5xl">🐈</Text>
          </View>
        </View>
      </View>

      <View className="absolute bottom-7 right-6">
        <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black" />
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.9}
          className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FFB6C9]"
        >
          <Text className="text-4xl font-black text-black">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
