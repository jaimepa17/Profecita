import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import LoadingScreen from '@/components/LoadingScreen';
import NameFormModal from '@/components/NameFormModal';
import { Carrera } from '@/lib/services/carrerasService';
import {
  Asignatura,
  createAsignatura,
  deleteAsignatura,
  listAsignaturasByAnio,
} from '@/lib/services/asignaturasService';
import { getAsignaturasStatsByIds, type AsignaturaStats } from '@/lib/services/statsService';
import { Anio } from '@/lib/services/aniosService';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { useRealtimeCollection } from '@/lib/realtime';

type AsignaturasScreenProps = {
  carrera: Carrera;
  anio: Anio;
  onBack: () => void;
  onOpenGrupos: (asignatura: Asignatura) => void;
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

export default function AsignaturasScreen({
  carrera,
  anio,
  onBack,
  onOpenGrupos,
}: AsignaturasScreenProps) {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [statsByAsignatura, setStatsByAsignatura] = useState<Record<string, AsignaturaStats>>({});
  const [statsLoadingByAsignatura, setStatsLoadingByAsignatura] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Asignatura | null>(null);
  const { run: runCreate, isRunning: creating } = useSingleFlight();
  const { run: runDelete, isRunning: isDeleting } = useKeyedSingleFlight<string>();

  const cargarAsignaturas = useCallback(async () => {
    // Solo mostrar loader si es la carga inicial
    if (!initialLoaded) {
      setLoading(true);
    }

    const result = await listAsignaturasByAnio(anio.id);

    if (!result.ok) {
      Alert.alert('No se pudieron cargar las asignaturas', result.error);
      setAsignaturas([]);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }

    setAsignaturas(result.data);
    setLoading(false);
    setInitialLoaded(true);
  }, [anio.id, initialLoaded]);

  useEffect(() => {
    void cargarAsignaturas();
  }, [cargarAsignaturas]);

  const crearNuevaAsignatura = async (nombre: string) => {
    await runCreate(async () => {
      const result = await createAsignatura({ anio_id: anio.id, nombre });

      if (!result.ok) {
        Alert.alert('No se pudo crear la asignatura', result.error);
        return;
      }

      // Realtime se encargará de agregar la asignatura automáticamente
      setCreateVisible(false);
    });
  };

  const eliminarAsignaturaActual = async (asignatura: Asignatura) => {
    await runDelete(asignatura.id, async () => {
      const result = await deleteAsignatura(asignatura.id);
      if (!result.ok) {
        Alert.alert('No se pudo eliminar la asignatura', result.error);
        return;
      }

      // Realtime se encargará de remover la asignatura automáticamente
      setPendingDelete(null);
    });
  };

  useRealtimeCollection<Asignatura>({
    enabled: true,
    table: 'asignaturas',
    filter: `anio_id=eq.${anio.id}`,
    channelName: `realtime:asignaturas:${anio.id}`,
    setItems: setAsignaturas,
    onForegroundSync: cargarAsignaturas,
  });

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (asignaturas.length === 0) {
        setStatsByAsignatura({});
        setStatsLoadingByAsignatura({});
        setPageReady(true);
        return;
      }

      const loadingMap: Record<string, boolean> = {};
      asignaturas.forEach((asignatura) => {
        loadingMap[asignatura.id] = true;
      });
      setStatsLoadingByAsignatura(loadingMap);

      const statsResult = await getAsignaturasStatsByIds(
        asignaturas.map((asignatura) => asignatura.id)
      );

      if (!mounted) {
        return;
      }

      if (statsResult.ok) {
        setStatsByAsignatura(statsResult.data);
      } else {
        setStatsByAsignatura({});
      }
      setStatsLoadingByAsignatura({});
      setPageReady(true);
    };

    void loadStats();

    return () => {
      mounted = false;
    };
  }, [asignaturas]);

  const renderItem = ({ item, index }: { item: Asignatura; index: number }) => {
    const title = item.nombre?.trim() || `Asignatura ${index + 1}`;
    const deleting = isDeleting(item.id);
    const stats = statsByAsignatura[item.id];
    const statsLoading = !!statsLoadingByAsignatura[item.id];

    return (
      <View className="mb-4">
        <View className="relative">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
          <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-5">
            <View className="rounded-full self-start border-[3px] border-black bg-[#EBD5FF] px-3 py-1">
              <Text className="text-xs font-black text-black">ASIGNATURA</Text>
            </View>

            <Text className="mt-3 text-xl font-black text-black">{title}</Text>

            <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Información de la asignatura
              </Text>

              {statsLoading ? (
                <Text className="mt-1 text-base font-semibold text-black">Cargando datos...</Text>
              ) : (
                <>
                  <Text className="mt-1 text-base font-semibold text-black">
                    {`Grupos: ${stats?.grupos ?? 0}`}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-black">
                    {`Estudiantes: ${stats?.estudiantes ?? 0}`}
                  </Text>
                </>
              )}
            </View>

            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => onOpenGrupos(item)}
                className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
              >
                <Text className="text-sm font-black text-black">Ver grupos</Text>
              </TouchableOpacity>

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
    return <LoadingScreen message="Cargando asignaturas..." emoji="📖" />;
  }

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <NameFormModal
        visible={createVisible}
        title="Nueva Asignatura"
        helperText={`Se agregará en ${anio.nombre} de ${carrera.nombre}.`}
        label="Nombre de la asignatura"
        placeholder="Ej: Matemáticas"
        submitLabel="Crear asignatura"
        submitting={creating}
        maxLength={100}
        onClose={() => {
          if (!creating) {
            setCreateVisible(false);
          }
        }}
        onSubmit={crearNuevaAsignatura}
      />

      <ConfirmActionModal
        visible={!!pendingDelete}
        title="Eliminar asignatura"
        message={pendingDelete
          ? `¿Seguro que deseas eliminar \"${pendingDelete.nombre}\"? Esto también eliminará sus grupos.`
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
          void eliminarAsignaturaActual(pendingDelete);
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
            <Text className="mt-3 text-2xl font-black text-[#1E140D]">Asignaturas de {anio.nombre}</Text>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 overflow-hidden rounded-[34px] border-[4px] border-black bg-[#F7F0E4]">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <Text className="text-sm font-black text-black">
                {`Asignaturas listadas: ${asignaturas.length}`}
              </Text>
            </View>
          </View>

          <FlatList
            data={asignaturas}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            ListEmptyComponent={
              <View className="mt-8 items-center px-3">
                <Text className="text-5xl">🧠</Text>
                <Text className="mt-3 text-center text-xl font-black text-black">
                  Aún no hay asignaturas creadas
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  disabled={creating}
                  onPress={() => setCreateVisible(true)}
                  className="mt-5 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-5 py-3"
                >
                  <Text className="text-base font-black text-black">+ Crear primera asignatura</Text>
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

      {asignaturas.length > 0 ? (
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
