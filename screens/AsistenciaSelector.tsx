import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomText } from '@/components/CustomText';
import type { RootStackParamList } from '@/types/navigation';
import {
  listGruposAsistenciaByProfesor,
  type GrupoAsistenciaOption,
} from '@/lib/services/asistenciaService';
import { BrainSticker } from '@/components/BrainSticker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AsistenciaSelector'>;

const CACHE_KEY = 'asistencia_grupos_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachePayload<T> = { savedAt: number; data: T };

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

export default function AsistenciaSelectorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [grupos, setGrupos] = useState<GrupoAsistenciaOption[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarGrupos = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    const result = await listGruposAsistenciaByProfesor();

    if (!result.ok) {
      Alert.alert('No se pudieron cargar los grupos', result.error);
      if (!options?.silent) setLoading(false);
      return;
    }

    setGrupos(result.data);
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data: result.data } satisfies CachePayload<GrupoAsistenciaOption[]>)
    );

    if (!options?.silent) setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && mounted) {
          const parsed = JSON.parse(cached) as CachePayload<GrupoAsistenciaOption[]>;
          const isFresh = Date.now() - Number(parsed.savedAt ?? 0) < CACHE_TTL_MS;
          if (isFresh && Array.isArray(parsed.data)) {
            setGrupos(parsed.data);
            setLoading(false);
          }
        }
      } catch {
        // Continuar con carga de red si falla el cache.
      }

      if (!mounted) return;
      await cargarGrupos({ silent: grupos.length > 0 });
    };

    void boot();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectGrupo = useCallback(
    (grupo: GrupoAsistenciaOption) => {
      navigation.navigate('Asistencia', {
        grupo: {
          id: grupo.id,
          asignatura_id: grupo.asignatura_id,
          nombre: grupo.nombre,
          turno: grupo.turno ?? null,
          created_at: '',
        },
        asignatura: {
          id: grupo.asignatura_id,
          anio_id: grupo.anio_id,
          nombre: grupo.asignatura_nombre,
          created_at: '',
        },
        anio: {
          id: grupo.anio_id,
          carrera_id: grupo.carrera_id,
          nombre: grupo.anio_nombre,
          created_at: '',
        },
        carrera: {
          id: grupo.carrera_id,
          profesor_id: '',
          nombre: grupo.carrera_nombre,
          created_at: '',
        },
      });
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: GrupoAsistenciaOption }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="button"
      onPress={() => handleSelectGrupo(item)}
      className="mb-3"
    >
      <View className="relative">
        <View className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-[20px] bg-black" />
        <View className="rounded-[20px] border-[3px] border-black bg-[#FDF9F1] p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <CustomText className="text-base font-black text-black">{item.nombre}</CustomText>
              <CustomText className="mt-1 text-xs font-semibold text-[#5E5045]">
                {item.asignatura_nombre}
              </CustomText>
            </View>
            {item.turno ? (
              <View className="rounded-full border-[2px] border-black bg-[#EBD5FF] px-2 py-0.5">
                <CustomText className="text-[10px] font-black text-black">{item.turno}</CustomText>
              </View>
            ) : null}
          </View>

          <View className="mt-3 rounded-xl border-[2px] border-black bg-[#FFF7E8] px-3 py-2">
            <CustomText className="text-xs font-semibold text-[#6B5A4A]">
              {item.carrera_nombre}  •  {item.anio_nombre}
            </CustomText>
          </View>

          <View className="mt-3 self-end">
            <View className="rounded-xl border-[2px] border-black bg-[#BDE9C7] px-3 py-1">
              <CustomText className="text-xs font-black text-black">Registrar asistencia →</CustomText>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      {/* Header */}
      <View className="relative mb-4 px-1">
        <View className="relative">
          <View className="absolute inset-0 translate-x-1.5 translate-y-2 rounded-[30px] bg-black" />
          <View className="rounded-[30px] border-[4px] border-black bg-[#EBD7BF] px-5 py-3.5">
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={navigation.goBack}
              className="self-start rounded-full border-[3px] border-black bg-white px-3 py-1"
            >
              <CustomText className="text-xs font-black text-black">← Volver</CustomText>
            </TouchableOpacity>
            <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Asistencia</CustomText>
            <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
              Selecciona el grupo para continuar
            </CustomText>
          </View>
        </View>
      </View>

      {/* Lista */}
      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 overflow-hidden rounded-[34px] border-[4px] border-black bg-[#F7F0E4]">
          <PaperGrid />

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#000" />
            </View>
          ) : (
            <FlatList
              data={grupos}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ListEmptyComponent={
                <View className="mt-12 items-center px-4">
                  <BrainSticker size={64} />
                  <CustomText className="mt-4 text-center text-xl font-black text-black">
                    Sin grupos disponibles
                  </CustomText>
                  <CustomText className="mt-2 text-center text-sm font-semibold text-[#5E5045]">
                    Aún no tienes grupos configurados para asistencia.
                  </CustomText>
                </View>
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 120,
                flexGrow: 1,
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
