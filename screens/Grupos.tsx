import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, TouchableOpacity, View } from 'react-native';
import { CustomText } from '../components/CustomText';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import GrupoFormModal from '@/components/GrupoFormModal';
import { ListLoaderSkeleton } from '@/components/ListLoaderSkeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Carrera } from '@/lib/services/carrerasService';
import { Anio } from '@/lib/services/aniosService';
import { Asignatura } from '@/lib/services/asignaturasService';
import { Grupo, createGrupo, deleteGrupo, listGruposByAsignatura } from '@/lib/services/gruposService';
import { getGruposStatsByIds, type GrupoStats } from '@/lib/services/statsService';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { useRealtimeCollection } from '@/lib/realtime';
import { InlineSkeleton } from '@/components/InlineSkeleton';
import { GroupSticker } from '@/components/GroupSticker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Grupos'>;
type RouteProps = RouteProp<RootStackParamList, 'Grupos'>;

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

export default function GruposScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { carrera, anio, asignatura } = route.params;
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [statsByGrupo, setStatsByGrupo] = useState<Record<string, GrupoStats>>({});
  const [statsLoadingByGrupo, setStatsLoadingByGrupo] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Grupo | null>(null);
  const { run: runCreate, isRunning: creating } = useSingleFlight();
  const { run: runDelete, isRunning: isDeleting } = useKeyedSingleFlight<string>();

  const cargarGrupos = useCallback(async () => {
    // Solo mostrar loader si es la carga inicial
    if (!initialLoaded) {
      setLoading(true);
    }

    const result = await listGruposByAsignatura(asignatura.id);

    if (!result.ok) {
      Alert.alert('No se pudieron cargar los grupos', result.error);
      setGrupos([]);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }

    setGrupos(result.data);
    await AsyncStorage.setItem(`grupos_${asignatura.id}_cache`, JSON.stringify(result.data));
    setLoading(false);
    setInitialLoaded(true);
  }, [asignatura.id, initialLoaded]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      // Cargar desde cache primero
      try {
        const cached = await AsyncStorage.getItem(`grupos_${asignatura.id}_cache`);
        if (cached && mounted) {
          setGrupos(JSON.parse(cached));
          setInitialLoaded(true);
          setLoading(false);
        }
      } catch (e) {
        // Ignorar errores de cache
      }

      // Luego cargar desde API (background update)
      await cargarGrupos();
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [cargarGrupos]);

  const crearNuevoGrupo = async (nombre: string, turno: string | null) => {
    await runCreate(async () => {
      const result = await createGrupo({
        asignatura_id: asignatura.id,
        nombre,
        turno,
      });

      if (!result.ok) {
        Alert.alert('No se pudo crear el grupo', result.error);
        return;
      }

      // Realtime se encargará de agregar el grupo automáticamente
      setCreateVisible(false);
    });
  };

  const eliminarGrupoActual = async (grupo: Grupo) => {
    await runDelete(grupo.id, async () => {
      const result = await deleteGrupo(grupo.id);
      if (!result.ok) {
        Alert.alert('No se pudo eliminar el grupo', result.error);
        return;
      }

      // Realtime se encargará de remover el grupo automáticamente
      setPendingDelete(null);
    });
  };

  useRealtimeCollection<Grupo>({
    enabled: true,
    table: 'grupos',
    filter: `asignatura_id=eq.${asignatura.id}`,
    channelName: `realtime:grupos:${asignatura.id}`,
    setItems: setGrupos,
    onForegroundSync: cargarGrupos,
  });

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (grupos.length === 0) {
        setStatsByGrupo({});
        setStatsLoadingByGrupo({});
        return;
      }

      const missingStatsMap: Record<string, boolean> = {};
      grupos.forEach((grupo) => {
        if (!statsByGrupo[grupo.id]) {
          missingStatsMap[grupo.id] = true;
        }
      });

      if (Object.keys(missingStatsMap).length > 0) {
        setStatsLoadingByGrupo((prev) => ({ ...prev, ...missingStatsMap }));
      }

      const statsResult = await getGruposStatsByIds(grupos.map((grupo) => grupo.id));

      if (!mounted) {
        return;
      }

      if (statsResult.ok) {
        setStatsByGrupo((prev) => ({ ...prev, ...statsResult.data }));
      }

      if (Object.keys(missingStatsMap).length > 0) {
        setStatsLoadingByGrupo((prev) => {
          const next = { ...prev };
          Object.keys(missingStatsMap).forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }
    };

    void loadStats();

    return () => {
      mounted = false;
    };
  }, [grupos]);

  const renderItem = ({ item, index }: { item: Grupo; index: number }) => {
    const title = item.nombre?.trim() || `Grupo ${index + 1}`;
    const turno = item.turno?.trim() || 'Sin turno';
    const deleting = isDeleting(item.id);
    const stats = statsByGrupo[item.id];
    const statsLoading = !!statsLoadingByGrupo[item.id];
    const showStatsLoading = statsLoading && !stats;

    return (
      <View className="mb-4">
        <View className="relative">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
          <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-5">
            <View className="rounded-full self-start border-[3px] border-black bg-[#FFD9A0] px-3 py-1">
              <CustomText className="text-xs font-black text-black">GRUPO</CustomText>
            </View>

            <CustomText className="mt-3 text-xl font-black text-black">{title}</CustomText>
            <CustomText className="mt-2 text-sm font-bold text-[#6B5A4A]">Turno: {turno}</CustomText>

            <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <CustomText className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Información del grupo
              </CustomText>

              {showStatsLoading ? (
                <View className="gap-1 mt-1">
                  <InlineSkeleton width="85%" />
                  <InlineSkeleton width="45%" />
                </View>
              ) : (
                <>
                  <CustomText className="mt-1 text-base font-semibold text-black">
                    {`Parciales: ${stats?.parciales ?? 0}  •  Bloques: ${stats?.bloques ?? 0}`}
                  </CustomText>
                  <CustomText className="mt-1 text-base font-semibold text-black">
                    {`Actividades: ${stats?.actividades ?? 0}  •  Estudiantes: ${stats?.estudiantes ?? 0}`}
                  </CustomText>
                </>
              )}
            </View>

            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ParcialesConfig', { carrera, anio, asignatura, grupo: item })}
                className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
              >
                <CustomText className="text-sm font-black text-black">Configurar notas</CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={deleting}
                onPress={() => setPendingDelete(item)}
                className="rounded-xl border-[3px] border-black bg-[#FFC9C2] px-4 py-2"
              >
                <CustomText className="text-sm font-black text-black">
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };



  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <GrupoFormModal
        visible={createVisible}
        submitting={creating}
        onClose={() => {
          if (!creating) {
            setCreateVisible(false);
          }
        }}
        onSubmit={crearNuevoGrupo}
      />

      <ConfirmActionModal
        visible={!!pendingDelete}
        title="Eliminar grupo"
        message={pendingDelete
          ? `¿Seguro que deseas eliminar \"${pendingDelete.nombre}\"?`
          : ''}
        confirmLabel="Eliminar"
        loading={pendingDelete ? isDeleting(pendingDelete.id) : false}
        onCancel={() => {
          if (pendingDelete && isDeleting(pendingDelete.id)) {
            return;
          }
          setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          void eliminarGrupoActual(pendingDelete);
        }}
      />

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
            <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Grupos de {asignatura.nombre}</CustomText>
            <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
              {carrera.nombre} • {anio.nombre}
            </CustomText>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 overflow-hidden rounded-[34px] border-[4px] border-black bg-[#F7F0E4]">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <CustomText className="text-sm font-black text-black">{`Grupos listados: ${grupos.length}`}</CustomText>
            </View>
          </View>

          <FlatList
            data={grupos}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            ListEmptyComponent={
              loading ? (
                <ListLoaderSkeleton />
              ) : (
                <View className="mt-8 items-center px-3">
                  <GroupSticker size={64} />
                  <CustomText className="mt-3 text-center text-xl font-black text-black">
                    Aún no hay grupos creados
                  </CustomText>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.9}
                    disabled={creating}
                    onPress={() => setCreateVisible(true)}
                    className="mt-5 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-5 py-3"
                  >
                    <CustomText className="text-base font-black text-black">+ Crear primer grupo</CustomText>
                  </TouchableOpacity>
                </View>
              )
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 120,
              flexGrow: 1,
            }}
          />
        </View>
      </View>

      {grupos.length > 0 ? (
        <View className="absolute bottom-7 left-6">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black" />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            disabled={creating}
            onPress={() => setCreateVisible(true)}
            className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FFB6C9]"
          >
            <CustomText className="text-4xl font-black text-black">+</CustomText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
