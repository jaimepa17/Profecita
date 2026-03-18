import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import LoadingScreen from '@/components/LoadingScreen';
import GrupoFormModal from '@/components/GrupoFormModal';
import { Carrera } from '@/lib/services/carrerasService';
import { Anio } from '@/lib/services/aniosService';
import { Asignatura } from '@/lib/services/asignaturasService';
import { Grupo, createGrupo, deleteGrupo, listGruposByAsignatura } from '@/lib/services/gruposService';
import { getGruposStatsByIds, type GrupoStats } from '@/lib/services/statsService';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { useRealtimeCollection } from '@/lib/realtime';

type GruposScreenProps = {
  carrera: Carrera;
  anio: Anio;
  asignatura: Asignatura;
  onBack: () => void;
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

export default function GruposScreen({
  carrera,
  anio,
  asignatura,
  onBack,
}: GruposScreenProps) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [statsByGrupo, setStatsByGrupo] = useState<Record<string, GrupoStats>>({});
  const [statsLoadingByGrupo, setStatsLoadingByGrupo] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [pageReady, setPageReady] = useState(false);
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
    setLoading(false);
    setInitialLoaded(true);
  }, [asignatura.id, initialLoaded]);

  useEffect(() => {
    void cargarGrupos();
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
        setPageReady(true);
        return;
      }

      const loadingMap: Record<string, boolean> = {};
      grupos.forEach((grupo) => {
        loadingMap[grupo.id] = true;
      });
      setStatsLoadingByGrupo(loadingMap);

      const statsResult = await getGruposStatsByIds(grupos.map((grupo) => grupo.id));

      if (!mounted) {
        return;
      }

      if (statsResult.ok) {
        setStatsByGrupo(statsResult.data);
      } else {
        setStatsByGrupo({});
      }
      setStatsLoadingByGrupo({});
      setPageReady(true);
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

    return (
      <View className="mb-4">
        <View className="relative">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
          <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-5">
            <View className="rounded-full self-start border-[3px] border-black bg-[#FFD9A0] px-3 py-1">
              <Text className="text-xs font-black text-black">GRUPO</Text>
            </View>

            <Text className="mt-3 text-xl font-black text-black">{title}</Text>
            <Text className="mt-2 text-sm font-bold text-[#6B5A4A]">Turno: {turno}</Text>

            <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Información del grupo
              </Text>

              {statsLoading ? (
                <Text className="mt-1 text-base font-semibold text-black">Cargando datos...</Text>
              ) : (
                <Text className="mt-1 text-base font-semibold text-black">
                  {`Estudiantes: ${stats?.estudiantes ?? 0}`}
                </Text>
              )}
            </View>

            <View className="mt-4 items-end">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={deleting}
                onPress={() => setPendingDelete(item)}
                className="rounded-xl border-[3px] border-black bg-[#FFC9C2] px-4 py-2"
              >
                <Text className="text-sm font-black text-black">
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading || !pageReady) {
    return <LoadingScreen message="Cargando grupos..." emoji="👥" />;
  }

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
              onPress={onBack}
              className="self-start rounded-full border-[3px] border-black bg-white px-3 py-1"
            >
              <Text className="text-xs font-black text-black">← Volver</Text>
            </TouchableOpacity>
            <Text className="mt-3 text-2xl font-black text-[#1E140D]">Grupos de {asignatura.nombre}</Text>
            <Text className="mt-1 text-sm font-semibold text-[#5E5045]">
              {carrera.nombre} • {anio.nombre}
            </Text>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 overflow-hidden rounded-[34px] border-[4px] border-black bg-[#F7F0E4]">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <Text className="text-sm font-black text-black">{`Grupos listados: ${grupos.length}`}</Text>
            </View>
          </View>

          <FlatList
            data={grupos}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            ListEmptyComponent={
              <View className="mt-8 items-center px-3">
                <Text className="text-5xl">👥</Text>
                <Text className="mt-3 text-center text-xl font-black text-black">
                  Aún no hay grupos creados
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  disabled={creating}
                  onPress={() => setCreateVisible(true)}
                  className="mt-5 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-5 py-3"
                >
                  <Text className="text-base font-black text-black">+ Crear primer grupo</Text>
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
            <Text className="text-4xl font-black text-black">+</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
