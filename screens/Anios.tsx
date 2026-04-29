import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, TouchableOpacity, View } from 'react-native';
import { CustomText } from '../components/CustomText';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import NameFormModal from '@/components/NameFormModal';
import { Carrera } from '@/lib/services/carrerasService';
import { Anio, createAnio, deleteAnio, listAniosByCarrera } from '@/lib/services/aniosService';
import { getAniosStatsByIds, type AnioStats } from '@/lib/services/statsService';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { useRealtimeCollection } from '@/lib/realtime';
import { InlineSkeleton } from '@/components/InlineSkeleton';
import { BooksSticker } from '@/components/BooksSticker';
import { getCached, getPrefetchKeyAnios, getPrefetchKeyAniosStats } from '@/lib/services/dataPrefetchService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Anios'>;
type RouteProps = RouteProp<RootStackParamList, 'Anios'>;

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

export default function AniosScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { carrera } = route.params;
  const [anios, setAnios] = useState<Anio[]>(
    () => getCached<Anio[]>(getPrefetchKeyAnios(carrera.id)) ?? [],
  );
  const [statsByAnio, setStatsByAnio] = useState<Record<string, AnioStats>>(
    () => getCached<Record<string, AnioStats>>(getPrefetchKeyAniosStats(carrera.id)) ?? {},
  );
  const [statsLoadingByAnio, setStatsLoadingByAnio] = useState<Record<string, boolean>>({});
  const [createVisible, setCreateVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Anio | null>(null);
  const { run: runCreate, isRunning: creating } = useSingleFlight();
  const { run: runDelete, isRunning: isDeleting } = useKeyedSingleFlight<string>();

  const cargarAnios = useCallback(async () => {
    const result = await listAniosByCarrera(carrera.id);

    if (!result.ok) {
      Alert.alert('No se pudieron cargar los años', result.error);
      setAnios([]);
      return;
    }

    setAnios(result.data);
  }, [carrera.id]);

  const crearNuevoAnio = async (nombre: string) => {
    await runCreate(async () => {
      const result = await createAnio({ carrera_id: carrera.id, nombre });

      if (!result.ok) {
        Alert.alert('No se pudo crear el año', result.error);
        return;
      }

      // Realtime se encargará de agregar el año automáticamente
      setCreateVisible(false);
    });
  };

  const eliminarAnio = async (anio: Anio) => {
    await runDelete(anio.id, async () => {
      const result = await deleteAnio(anio.id);
      if (!result.ok) {
        Alert.alert('No se pudo eliminar el año', result.error);
        return;
      }

      // Realtime se encargará de remover el año automáticamente
      setPendingDelete(null);
    });
  };

  useRealtimeCollection<Anio>({
    enabled: true,
    table: 'anios',
    filter: `carrera_id=eq.${carrera.id}`,
    channelName: `realtime:anios:${carrera.id}`,
    setItems: setAnios,
    onForegroundSync: cargarAnios,
  });

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (anios.length === 0) {
        setStatsByAnio({});
        setStatsLoadingByAnio({});
        return;
      }

      const missingStatsMap: Record<string, boolean> = {};
      anios.forEach((anio) => {
        if (!statsByAnio[anio.id]) {
          missingStatsMap[anio.id] = true;
        }
      });

      if (Object.keys(missingStatsMap).length > 0) {
        setStatsLoadingByAnio((prev) => ({ ...prev, ...missingStatsMap }));
      }

      const statsResult = await getAniosStatsByIds(anios.map((anio) => anio.id));

      if (!mounted) {
        return;
      }

      if (statsResult.ok) {
        setStatsByAnio((prev) => ({ ...prev, ...statsResult.data }));
      }

      if (Object.keys(missingStatsMap).length > 0) {
        setStatsLoadingByAnio((prev) => {
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
  }, [anios]);

  const renderItem = ({ item, index }: { item: Anio; index: number }) => {
    const title = item.nombre?.trim() || `Año ${index + 1}`;
    const deleting = isDeleting(item.id);
    const stats = statsByAnio[item.id];
    const statsLoading = !!statsLoadingByAnio[item.id];
    const showStatsLoading = statsLoading && !stats;

    return (
      <View className="mb-4">
        <View className="relative">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
          <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-5">
            <View className="rounded-full self-start border-[3px] border-black bg-[#D7ECFF] px-3 py-1">
              <CustomText className="text-xs font-black text-black">AÑO</CustomText>
            </View>

            <CustomText className="mt-3 text-xl font-black text-black">{title}</CustomText>

            <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <CustomText className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Información del año
              </CustomText>

              {showStatsLoading ? (
                <View className="gap-1 mt-1">
                  <InlineSkeleton width="85%" />
                  <InlineSkeleton width="45%" />
                </View>
              ) : (
                <>
                  <CustomText className="mt-1 text-base font-semibold text-black">
                    {`Asignaturas: ${stats?.asignaturas ?? 0}  •  Grupos: ${stats?.grupos ?? 0}`}
                  </CustomText>
                  <CustomText className="mt-1 text-base font-semibold text-black">
                    {`Estudiantes: ${stats?.estudiantes ?? 0}`}
                  </CustomText>
                </>
              )}
            </View>

            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Asignaturas', { carrera, anio: item })}
                className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
              >
                <CustomText className="text-sm font-black text-black">Ver asignaturas</CustomText>
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
      <NameFormModal
        visible={createVisible}
        title="Nuevo Año"
        helperText={`Se agregará dentro de ${carrera.nombre}.`}
        label="Nombre del año"
        placeholder="Ej: 1er Año"
        submitLabel="Crear año"
        submitting={creating}
        maxLength={50}
        onClose={() => {
          if (!creating) {
            setCreateVisible(false);
          }
        }}
        onSubmit={crearNuevoAnio}
      />

      <ConfirmActionModal
        visible={!!pendingDelete}
        title="Eliminar año"
        message={pendingDelete
          ? `¿Seguro que deseas eliminar \"${pendingDelete.nombre}\"? Esto también eliminará sus asignaturas y grupos.`
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
          void eliminarAnio(pendingDelete);
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
            <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Años de {carrera.nombre}</CustomText>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 rounded-[34px] border-[4px] border-black bg-[#F7F0E4] overflow-hidden px-0.5 pb-0.5">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <CustomText className="text-sm font-black text-black">{`Años listados: ${anios.length}`}</CustomText>
            </View>
          </View>

          <FlatList
            data={anios}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            ListEmptyComponent={
              <View className="mt-8 items-center px-3">
                <BooksSticker size={64} />
                <CustomText className="mt-3 text-center text-xl font-black text-black">
                  Aún no hay años creados
                </CustomText>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  disabled={creating}
                  onPress={() => setCreateVisible(true)}
                  className="mt-5 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-5 py-3"
                >
                  <CustomText className="text-base font-black text-black">+ Crear primer año</CustomText>
                </TouchableOpacity>
              </View>
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

      {anios.length > 0 ? (
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
