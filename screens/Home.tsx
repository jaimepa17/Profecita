import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import AccountPanel from '../components/AccountPanel';
import CarreraFormModal from '../components/CarreraFormModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createCarrera,
  deleteCarrera,
  listCarreras,
  type Carrera as CarreraModel,
} from '@/lib/services/carrerasService';
import { getCarrerasStatsByIds, type CarreraStats } from '@/lib/services/statsService';
import { useRealtimeCollection, useRealtimeTable } from '@/lib/realtime';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { listEstudiantesByProfesor } from '@/lib/services/estudiantesService';

type Carrera = CarreraModel;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const PaperGrid = () => (
  <View
    className="absolute inset-0 overflow-hidden rounded-[34px]"
    style={{ pointerEvents: 'none' }}
  >
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

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [statsByCarrera, setStatsByCarrera] = useState<Record<string, CarreraStats>>({});
  const [statsLoadingByCarrera, setStatsLoadingByCarrera] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [accountPanelVisible, setAccountPanelVisible] = useState(false);
  const [createCarreraVisible, setCreateCarreraVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [pendingDeleteCarrera, setPendingDeleteCarrera] = useState<Carrera | null>(null);
  const [realtimeUserId, setRealtimeUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [estudianteIds, setEstudianteIds] = useState<string[]>([]);
  const [statsVersion, setStatsVersion] = useState(0);
  const { run: runCreateCarrera, isRunning: creatingCarrera } = useSingleFlight();
  const { run: runSignOut, isRunning: signingOut } = useSingleFlight();
  const { run: runDeleteCarrera, isRunning: isDeletingCarrera } =
    useKeyedSingleFlight<string>();

  const cargarCarreras = useCallback(async () => {
    // Solo mostrar loader si es la carga inicial
    if (!initialLoaded) {
      setLoading(true);
    }

    const result = await listCarreras();

    if (!result.ok) {
      Alert.alert('No se pudieron cargar las carreras', result.error);
      setCarreras([]);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }

    setCarreras(result.data);
    await AsyncStorage.setItem('carreras_cache', JSON.stringify(result.data));
    setLoading(false);
    setInitialLoaded(true);
  }, [initialLoaded]);

  const incrementStatsVersion = useCallback(() => {
    setStatsVersion(v => v + 1);
  }, []);

  const handleEstudianteInsert = useCallback((row: any) => {
    setEstudianteIds(prev => [...prev, row.id]);
    incrementStatsVersion();
  }, [incrementStatsVersion]);

  const handleEstudianteUpdate = useCallback((row: any) => {
    // Si el estudiante cambió de profesor (no debería), podríamos necesitar actualizar la lista.
    // Por simplicidad, recargamos la lista completa.
    // Pero podemos verificar si el profesor_id sigue siendo el mismo.
    // Por ahora, solo incrementamos statsVersion.
    incrementStatsVersion();
  }, [incrementStatsVersion]);

  const handleEstudianteDelete = useCallback((row: { id: string }) => {
    setEstudianteIds(prev => prev.filter(id => id !== row.id));
    incrementStatsVersion();
  }, [incrementStatsVersion]);

  const handleGrupoEstudianteEvent = useCallback((estudianteId: string) => {
    setEstudianteIds(currentIds => {
      if (currentIds.includes(estudianteId)) {
        // Este estudiante pertenece al profesor, incrementar stats
        incrementStatsVersion();
      }
      return currentIds;
    });
  }, [incrementStatsVersion]);

  const openCreateCarrera = () => {
    setCreateCarreraVisible(true);
  };

  const closeCreateCarrera = () => {
    if (creatingCarrera) {
      return;
    }
    setCreateCarreraVisible(false);
  };

  const crearNuevaCarrera = async (nombre: string) => {
    await runCreateCarrera(async () => {
      const result = await createCarrera({ nombre });

      if (!result.ok) {
        Alert.alert('No se pudo crear la carrera', result.error);
        return;
      }

      // Realtime se encargará de agregar la carrera automáticamente
      setCreateCarreraVisible(false);
    });
  };

  const ejecutarEliminarCarrera = async (carrera: Carrera) => {
    await runDeleteCarrera(carrera.id, async () => {
      const result = await deleteCarrera(carrera.id);

      if (!result.ok) {
        Alert.alert('No se pudo eliminar la carrera', result.error);
        return;
      }

      // Realtime se encargará de remover la carrera automáticamente
      setPendingDeleteCarrera(null);
    });
  };

  const confirmarEliminarCarrera = (carrera: Carrera) => {
    setPendingDeleteCarrera(carrera);
  };

  const cancelarEliminarCarrera = () => {
    if (pendingDeleteCarrera && isDeletingCarrera(pendingDeleteCarrera.id)) {
      return;
    }
    setPendingDeleteCarrera(null);
  };

  const confirmarEliminarDesdeModal = () => {
    if (!pendingDeleteCarrera) {
      return;
    }
    void ejecutarEliminarCarrera(pendingDeleteCarrera);
  };

  const cerrarSesion = async () => {
    try {
      console.log('[CERRAR SESION] Cerrando modal de cuenta...');
      setAccountPanelVisible(false);
      
      // Esperar a que la animación del modal se complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('[CERRAR SESION] Iniciando cierre de sesión...');
      const { error } = await supabase.auth.signOut();
      console.log('[CERRAR SESION] Resultado de signOut:', { error: error?.message ?? 'sin error' });
      
      if (error) {
        Alert.alert('No se pudo cerrar sesión', error.message);
      } else {
        console.log('[CERRAR SESION] SignOut exitoso. Esperando navegación desde App.tsx...');
      }
    } catch (err) {
      console.log('[CERRAR SESION] Error inesperado:', err);
      Alert.alert('Error', 'Ocurrió un error al cerrar sesión');
    }
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
    let mounted = true;

    const bootstrap = async () => {
      // Cargar desde cache primero
      try {
        const cached = await AsyncStorage.getItem('carreras_cache');
        if (cached && mounted) {
          setCarreras(JSON.parse(cached));
          setInitialLoaded(true);
          setLoading(false);
        }
      } catch (e) {
        // Ignorar errores de cache
      }

      // Luego cargar desde API (background update)
      await cargarCarreras();

      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      setRealtimeUserId(data.session?.user?.id ?? null);
      setUserEmail(data.session?.user?.email ?? undefined);
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [cargarCarreras]);

  useEffect(() => {
    let mounted = true;

    const loadEstudiantes = async () => {
      if (!realtimeUserId) {
        setEstudianteIds([]);
        return;
      }
      const result = await listEstudiantesByProfesor(realtimeUserId);
      if (!mounted) return;
      if (result.ok) {
        setEstudianteIds(result.data.map(e => e.id));
      }
    };

    void loadEstudiantes();

    return () => {
      mounted = false;
    };
  }, [realtimeUserId]);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (carreras.length === 0) {
        setStatsByCarrera({});
        setStatsLoadingByCarrera({});
        return;
      }

      // Solo mostrar "Cargando" en cards sin datos previos para evitar parpadeo.
      const missingStatsMap: Record<string, boolean> = {};
      carreras.forEach((carrera) => {
        if (!statsByCarrera[carrera.id]) {
          missingStatsMap[carrera.id] = true;
        }
      });

      if (Object.keys(missingStatsMap).length > 0) {
        setStatsLoadingByCarrera((prev) => ({ ...prev, ...missingStatsMap }));
      }

      const statsResult = await getCarrerasStatsByIds(carreras.map((carrera) => carrera.id));

      if (!mounted) {
        return;
      }

      if (statsResult.ok) {
        setStatsByCarrera((prev) => ({ ...prev, ...statsResult.data }));
      }

      if (Object.keys(missingStatsMap).length > 0) {
        setStatsLoadingByCarrera((prev) => {
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
  }, [carreras, statsVersion]);

  useRealtimeCollection<Carrera>({
    enabled: !!realtimeUserId,
    table: 'carreras',
    filter: realtimeUserId ? `profesor_id=eq.${realtimeUserId}` : undefined,
    channelName: `realtime:carreras:${realtimeUserId ?? 'anon'}`,
    setItems: setCarreras,
    onForegroundSync: cargarCarreras,
  });

  useRealtimeTable({
    enabled: !!realtimeUserId,
    table: 'estudiantes',
    filter: realtimeUserId ? `profesor_id=eq.${realtimeUserId}` : undefined,
    channelName: `realtime:estudiantes:${realtimeUserId ?? 'anon'}`,
    onInsert: handleEstudianteInsert,
    onUpdate: handleEstudianteUpdate,
    onDelete: handleEstudianteDelete,
  });

  useRealtimeTable({
    enabled: !!realtimeUserId,
    table: 'grupo_estudiantes',
    filter: undefined,
    channelName: `realtime:grupo_estudiantes:${realtimeUserId ?? 'anon'}`,
    onInsert: (row) => handleGrupoEstudianteEvent((row as any).estudiante_id),
    onUpdate: (row) => handleGrupoEstudianteEvent((row as any).estudiante_id),
    onDelete: (row) => handleGrupoEstudianteEvent((row as any).estudiante_id),
  });

  const renderCarrera = ({ item, index }: { item: Carrera; index: number }) => {
    const titulo =
      (typeof item.nombre === 'string' && item.nombre.trim()) ||
      `Carrera ${index + 1}`;
    const isDeleting = isDeletingCarrera(item.id);
    const stats = statsByCarrera[item.id];
    const statsLoading = !!statsLoadingByCarrera[item.id];
    const showStatsLoading = statsLoading && !stats;

    return (
      <View className="mb-5">
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
                <Text className="text-xs font-black text-black">CARRERA</Text>
              </View>
            </View>

            <View className="rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Información de la carrera
              </Text>

              {showStatsLoading ? (
                <Text className="mt-1 text-base font-semibold text-black">Cargando datos...</Text>
              ) : (
                <>
                  <Text className="mt-1 text-base font-semibold text-black">
                    {`Años: ${stats?.anios ?? 0}  •  Asignaturas: ${stats?.asignaturas ?? 0}`}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-black">
                    {`Grupos: ${stats?.grupos ?? 0}  •  Estudiantes: ${stats?.estudiantes ?? 0}`}
                  </Text>
                </>
              )}
            </View>

            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Anios', { carrera: item })}
                className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
              >
                <Text className="text-sm font-black text-black">Ver años</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={isDeleting}
                onPress={() => confirmarEliminarCarrera(item)}
                className="rounded-xl border-[3px] border-black bg-[#FFC9C2] px-4 py-2"
              >
                <Text className="text-sm font-black text-black">
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const Header = () => (
    <View>
      <Text className="text-2xl font-black text-[#1E140D]">¡Hola, Profe!</Text>
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
            disabled={creatingCarrera}
            onPress={openCreateCarrera}
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

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <AccountPanel
        visible={accountPanelVisible}
        onRequestClose={closeAccountPanel}
        onChangeAccount={cambiarCuenta}
        onSignOut={cerrarSesion}
        signingOut={signingOut}
        userEmail={userEmail}
      />

      <CarreraFormModal
        visible={createCarreraVisible}
        submitting={creatingCarrera}
        onClose={closeCreateCarrera}
        onSubmit={crearNuevaCarrera}
      />

      <Modal
        visible={quickActionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickActionsVisible(false)}
      >
        <Pressable className="flex-1 bg-black/35" onPress={() => setQuickActionsVisible(false)}>
          <View className="flex-1 justify-end px-5 pb-28">
            <Pressable className="rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-4">
              <Text className="text-lg font-black text-black">Acciones rápidas</Text>
              <Text className="mt-1 text-sm font-semibold text-[#6B5A4A]">
                Elige qué deseas hacer
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => {
                  setQuickActionsVisible(false);
                  openCreateCarrera();
                }}
                className="mt-4 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-4 py-3"
              >
                <Text className="text-sm font-black text-black">+ Crear carrera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => {
                  setQuickActionsVisible(false);
                  navigation.navigate('Estudiantes');
                }}
                className="mt-3 rounded-2xl border-[3px] border-black bg-[#D7ECFF] px-4 py-3"
              >
                <Text className="text-sm font-black text-black">Ir a Estudiantes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => {
                  setQuickActionsVisible(false);
                  navigation.navigate('RegistroNotasActividad');
                }}
                className="mt-3 rounded-2xl border-[3px] border-black bg-[#BDE9C7] px-4 py-3"
              >
                <Text className="text-sm font-black text-black">Registrar notas por actividad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => {
                  setQuickActionsVisible(false);
                  navigation.navigate('Reportes');
                }}
                className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-4 py-3"
              >
                <Text className="text-sm font-black text-black">Ver reportes de notas</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ConfirmActionModal
        visible={!!pendingDeleteCarrera}
        title="Eliminar carrera"
        message={pendingDeleteCarrera
          ? `¿Seguro que deseas eliminar "${pendingDeleteCarrera.nombre}"? Esta acción no se puede deshacer.`
          : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={pendingDeleteCarrera ? isDeletingCarrera(pendingDeleteCarrera.id) : false}
        onCancel={cancelarEliminarCarrera}
        onConfirm={confirmarEliminarDesdeModal}
      />

      <View className="relative mb-4 px-1">
        <View className="pr-24">
          <View className="relative">
            <View className="absolute inset-0 translate-x-1.5 translate-y-2 rounded-[30px] bg-black" />
            <View className="rounded-[30px] border-[4px] border-black bg-[#EBD7BF] px-5 py-3.5">
              <Header />
            </View>
          </View>
        </View>

        <View className="absolute right-1 -top-1">
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
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 rounded-[34px] border-[4px] border-black bg-[#F7F0E4] overflow-hidden">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <Text className="text-sm font-black text-black">
                {`Carreras listadas: ${carreras.length}`}
              </Text>
            </View>
          </View>

          <FlatList
            data={carreras}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderCarrera}
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 120,
              flexGrow: 1,
            }}
          />

          <View className="absolute -bottom-4 -right-2 rotate-[-16deg]">
            <Text className="text-5xl">🐈</Text>
          </View>
        </View>
      </View>

      {carreras.length > 0 ? (
        <View className="absolute bottom-7 left-6">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black" />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            onPress={() => setQuickActionsVisible(true)}
            className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FFB6C9]"
          >
            <Text className="text-4xl font-black text-black">+</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
