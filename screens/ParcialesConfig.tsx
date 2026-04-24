import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { CustomText } from '../components/CustomText';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';
import ActividadFormModal from '@/components/ActividadFormModal';
import AlertModal, { type AlertModalPayload, type AlertModalType } from '@/components/AlertModal';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import NameFormModal from '@/components/NameFormModal';
import { InlineSkeleton } from '@/components/InlineSkeleton';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { useRealtimeCollection } from '@/lib/realtime';
import {
  createActividad,
  deleteActividad,
  listActividadesByBloque,
  type Actividad,
} from '@/lib/services/actividadesService';
import { 
  createBloque,
  deleteBloque,
  listBloquesByParcial,
  type Bloque,
} from '@/lib/services/bloquesService';
import { type Anio } from '@/lib/services/aniosService';
import { type Asignatura } from '@/lib/services/asignaturasService';
import { type Carrera } from '@/lib/services/carrerasService';
import {
  createParcial,
  deleteParcial,
  listParcialesByGrupo,
  type Parcial,
} from '@/lib/services/parcialesService';
import { type Grupo } from '@/lib/services/gruposService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ParcialesConfig'>;
type RouteProps = RouteProp<RootStackParamList, 'ParcialesConfig'>;

type PendingDelete =
  | { kind: 'parcial'; parcial: Parcial }
  | { kind: 'bloque'; bloque: Bloque }
  | { kind: 'actividad'; actividad: Actividad };

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

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

export default function ParcialesConfigScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { carrera, anio, asignatura, grupo } = route.params;
  const [resumenParcialById, setResumenParcialById] = useState<
    Record<string, { bloques: number; actividades: number }>
  >({});
  const [parciales, setParciales] = useState<Parcial[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [selectedParcialId, setSelectedParcialId] = useState<string | null>(null);
  const [selectedBloqueId, setSelectedBloqueId] = useState<string | null>(null);

  const [loadingParciales, setLoadingParciales] = useState(true);
  const [loadingBloques, setLoadingBloques] = useState(true);
  const [loadingActividades, setLoadingActividades] = useState(true);
  const [initialParcialesLoaded, setInitialParcialesLoaded] = useState(false);
  const [initialBloquesLoaded, setInitialBloquesLoaded] = useState(false);
  const [initialActividadesLoaded, setInitialActividadesLoaded] = useState(false);

  const [createParcialVisible, setCreateParcialVisible] = useState(false);
  const [createBloqueVisible, setCreateBloqueVisible] = useState(false);
  const [createActividadVisible, setCreateActividadVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    payload: AlertModalPayload;
  }>({
    visible: false,
    payload: {
      type: 'info',
      title: '',
      message: '',
    },
  });

  const { run: runCreateParcial, isRunning: creatingParcial } = useSingleFlight();
  const { run: runCreateBloque, isRunning: creatingBloque } = useSingleFlight();
  const { run: runCreateActividad, isRunning: creatingActividad } = useSingleFlight();
  const { run: runDelete, isRunning: isDeletingById } = useKeyedSingleFlight<string>();

  const showFeedback = useCallback((type: AlertModalType, title: string, message: string) => {
    setFeedbackModal({
      visible: true,
      payload: { type, title, message },
    });
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedbackModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const cargarParciales = useCallback(async () => {
    if (!initialParcialesLoaded) {
      setLoadingParciales(true);
    }

    const result = await listParcialesByGrupo(grupo.id);
    if (!result.ok) {
      showFeedback('error', 'No se pudieron cargar los parciales', result.error);
      setParciales([]);
      setLoadingParciales(false);
      setInitialParcialesLoaded(true);
      return;
    }

    setParciales(result.data);
    setLoadingParciales(false);
    setInitialParcialesLoaded(true);
  }, [grupo.id, showFeedback, initialParcialesLoaded]);

  const cargarBloques = useCallback(async () => {
    if (!selectedParcialId) {
      setBloques([]);
      setLoadingBloques(false);
      setInitialBloquesLoaded(true);
      return;
    }

    if (!initialBloquesLoaded) {
      setLoadingBloques(true);
    }

    const result = await listBloquesByParcial(selectedParcialId);
    if (!result.ok) {
      showFeedback('error', 'No se pudieron cargar los bloques', result.error);
      setBloques([]);
      setLoadingBloques(false);
      setInitialBloquesLoaded(true);
      return;
    }

    setBloques(result.data);
    setSelectedBloqueId(null); // Reset bloque cuando cambia parcial
    setLoadingBloques(false);
    setInitialBloquesLoaded(true);
  }, [selectedParcialId, initialBloquesLoaded, showFeedback]);

  const cargarActividades = useCallback(async () => {
    if (!selectedBloqueId) {
      setActividades([]);
      setLoadingActividades(false);
      setInitialActividadesLoaded(true);
      return;
    }

    if (!initialActividadesLoaded) {
      setLoadingActividades(true);
    }

    const result = await listActividadesByBloque(selectedBloqueId);
    if (!result.ok) {
      showFeedback('error', 'No se pudieron cargar las actividades', result.error);
      setActividades([]);
      setLoadingActividades(false);
      setInitialActividadesLoaded(true);
      return;
    }

    setActividades(result.data);
    setLoadingActividades(false);
    setInitialActividadesLoaded(true);
  }, [selectedBloqueId, initialActividadesLoaded, showFeedback]);

  useEffect(() => {
    void cargarParciales();
  }, [cargarParciales]);

  useEffect(() => {
    if (parciales.length === 0) {
      setSelectedParcialId(null);
      setInitialBloquesLoaded(true);
      setLoadingBloques(false);
      setInitialActividadesLoaded(true);
      setLoadingActividades(false);
      return;
    }

    if (!selectedParcialId || !parciales.some((item) => item.id === selectedParcialId)) {
      setSelectedParcialId(parciales[0].id);
      setInitialBloquesLoaded(false);
      setLoadingBloques(true);
      setInitialActividadesLoaded(false);
      setLoadingActividades(false);
    }
  }, [parciales, selectedParcialId]);

  useEffect(() => {
    void cargarBloques();
  }, [cargarBloques]);

  useEffect(() => {
    if (bloques.length === 0) {
      setSelectedBloqueId(null);
      setInitialActividadesLoaded(true);
      setLoadingActividades(false);
      return;
    }

    if (!selectedBloqueId || !bloques.some((item) => item.id === selectedBloqueId)) {
      setSelectedBloqueId(bloques[0].id);
      setInitialActividadesLoaded(false);
      setLoadingActividades(true);
    }
  }, [bloques, selectedBloqueId]);

  useEffect(() => {
    if (!selectedBloqueId) {
      setActividades([]);
      setInitialActividadesLoaded(true);
      setLoadingActividades(false);
      return;
    }

    void cargarActividades();
  }, [selectedBloqueId, cargarActividades]);

  useEffect(() => {
    let mounted = true;

    const cargarResumenParciales = async () => {
      if (parciales.length === 0) {
        if (mounted) {
          setResumenParcialById({});
        }
        return;
      }

      const resumenEntries = await Promise.all(
        parciales.map(async (parcial) => {
          const bloquesResult = await listBloquesByParcial(parcial.id);
          if (!bloquesResult.ok) {
            return [parcial.id, { bloques: 0, actividades: 0 }] as const;
          }

          const bloquesDelParcial = bloquesResult.data;
          const bloquesCount = bloquesDelParcial.length;

          if (bloquesCount === 0) {
            return [parcial.id, { bloques: 0, actividades: 0 }] as const;
          }

          const actividadesPorBloque = await Promise.all(
            bloquesDelParcial.map(async (bloque) => {
              const actividadesResult = await listActividadesByBloque(bloque.id);
              return actividadesResult.ok ? actividadesResult.data.length : 0;
            })
          );

          const actividadesCount = actividadesPorBloque.reduce((acc, count) => acc + count, 0);
          return [parcial.id, { bloques: bloquesCount, actividades: actividadesCount }] as const;
        })
      );

      if (!mounted) {
        return;
      }

      setResumenParcialById(
        resumenEntries.reduce<Record<string, { bloques: number; actividades: number }>>(
          (acc, [parcialId, resumen]) => {
            acc[parcialId] = resumen;
            return acc;
          },
          {}
        )
      );
    };

    void cargarResumenParciales();

    return () => {
      mounted = false;
    };
  }, [parciales, bloques, actividades]);

  useRealtimeCollection<Parcial>({
    enabled: true,
    table: 'parciales',
    filter: `grupo_id=eq.${grupo.id}`,
    channelName: `parciales_${grupo.id}`,
    setItems: setParciales,
    onForegroundSync: cargarParciales,
  });

  useRealtimeCollection<Bloque>({
    enabled: !!selectedParcialId,
    table: 'bloques',
    filter: selectedParcialId ? `parcial_id=eq.${selectedParcialId}` : undefined,
    channelName: `bloques_${selectedParcialId ?? 'none'}`,
    setItems: setBloques,
    onForegroundSync: cargarBloques,
  });

  useRealtimeCollection<Actividad>({
    enabled: !!selectedBloqueId,
    table: 'actividades',
    filter: selectedBloqueId ? `bloque_id=eq.${selectedBloqueId}` : undefined,
    channelName: `actividades_${selectedBloqueId ?? 'none'}`,
    setItems: setActividades,
    onForegroundSync: cargarActividades,
  });

  const parcialSeleccionado = useMemo(
    () => parciales.find((item) => item.id === selectedParcialId) ?? null,
    [parciales, selectedParcialId]
  );

  const bloqueSeleccionado = useMemo(
    () => bloques.find((item) => item.id === selectedBloqueId) ?? null,
    [bloques, selectedBloqueId]
  );

  const sumaActual = useMemo(
    () => roundTo2(actividades.reduce((acc, act) => acc + Number(act.peso_porcentaje ?? 0), 0)),
    [actividades]
  );

  const puntosDisponibles = useMemo(() => roundTo2(Math.max(0, 100 - sumaActual)), [sumaActual]);
  const estadoCompletado = sumaActual === 100;

  const sumaBloques = useMemo(
    () => roundTo2(bloques.reduce((acc, bloque) => acc + Number(bloque.peso_porcentaje ?? 0), 0)),
    [bloques]
  );
  const pesoBloquesDisponible = useMemo(() => roundTo2(Math.max(0, 100 - sumaBloques)), [sumaBloques]);
  const bloquesCompletos = sumaBloques === 100;

  const sumaParciales = useMemo(
    () => roundTo2(parciales.reduce((acc, parcial) => acc + Number(parcial.peso_porcentaje ?? 0), 0)),
    [parciales]
  );
  const pesoParcialesDisponible = useMemo(() => roundTo2(Math.max(0, 100 - sumaParciales)), [sumaParciales]);
  const parcialesCompletos = sumaParciales === 100;

  const pageReady = initialParcialesLoaded && initialBloquesLoaded && initialActividadesLoaded && !loadingParciales && !loadingBloques && !loadingActividades;

  const crearNuevoParcial = async (nombre: string) => {
    await runCreateParcial(async () => {
      const pesoInicial = parciales.length === 0 ? 100 : 0;
      const result = await createParcial({
        grupo_id: grupo.id,
        nombre,
        peso_porcentaje: pesoInicial,
      });

      if (!result.ok) {
        showFeedback('error', 'No se pudo crear el parcial', result.error);
        return;
      }

      setCreateParcialVisible(false);
      setSelectedParcialId(result.data.id);
      setInitialBloquesLoaded(false);
      setLoadingBloques(true);
      showFeedback(
        'success',
        'Parcial creado',
        'El sistema ajustará automáticamente los valores entre todos los parciales.'
      );
    });
  };

  const crearNuevoBloque = async (nombre: string) => {
    if (!selectedParcialId) {
      showFeedback('warning', 'Selecciona un parcial', 'Primero selecciona un parcial para crear el bloque.');
      return;
    }

    await runCreateBloque(async () => {
      const pesoInicial = bloques.length === 0 ? 100 : 0;
      const result = await createBloque({
        parcial_id: selectedParcialId,
        nombre,
        peso_porcentaje: pesoInicial,
      });

      if (!result.ok) {
        showFeedback('error', 'No se pudo crear el bloque', result.error);
        return;
      }

      setCreateBloqueVisible(false);
      setSelectedBloqueId(result.data.id);
      setInitialActividadesLoaded(false);
      setLoadingActividades(true);

      showFeedback(
        'success',
        'Bloque creado',
        'El sistema ajustará automáticamente los valores entre todos los bloques del parcial.'
      );
    });
  };



  const crearNuevaActividad = async (payload: {
    nombre: string;
    tipo: 'corte' | 'examen';
    peso_porcentaje: number;
  }) => {
    if (!selectedBloqueId) {
      showFeedback(
        'warning',
        'Selecciona un bloque',
        'Primero crea y selecciona un bloque para registrar actividades.'
      );
      return;
    }

    if (payload.peso_porcentaje > puntosDisponibles) {
      showFeedback(
        'warning',
        'Peso inválido',
        `El peso supera los puntos disponibles (${puntosDisponibles}).`
      );
      return;
    }

    await runCreateActividad(async () => {
      const result = await createActividad({
        bloque_id: selectedBloqueId,
        nombre: payload.nombre,
        tipo: payload.tipo,
        peso_porcentaje: payload.peso_porcentaje,
      });

      if (!result.ok) {
        showFeedback('error', 'No se pudo crear la actividad', result.error);
        return;
      }

      setCreateActividadVisible(false);
      showFeedback('success', 'Actividad creada', 'La actividad fue agregada correctamente.');
    });
  };

  const confirmarEliminar = async () => {
    if (!pendingDelete) {
      return;
    }

    if (pendingDelete.kind === 'parcial') {
      await runDelete(pendingDelete.parcial.id, async () => {
        // Optimistic: remove immediately from UI
        const deletedParcial = pendingDelete.parcial;
        setParciales((prev) => prev.filter((p) => p.id !== deletedParcial.id));
        setPendingDelete(null);
        
        // Call delete API
        const result = await deleteParcial(deletedParcial.id);
        if (!result.ok) {
          showFeedback('error', 'No se pudo eliminar el parcial', result.error);
          // Restore on failure
          setParciales((prev) => [deletedParcial, ...prev]);
          return;
        }
        
        showFeedback('success', 'Parcial eliminado', 'El parcial fue eliminado correctamente.');
      });
      return;
    }

    if (pendingDelete.kind === 'bloque') {
      await runDelete(pendingDelete.bloque.id, async () => {
        // Optimistic: remove immediately from UI
        const deletedBloque = pendingDelete.bloque;
        setBloques((prev) => prev.filter((b) => b.id !== deletedBloque.id));
        setPendingDelete(null);
        
        // Call delete API
        const result = await deleteBloque(deletedBloque.id);
        if (!result.ok) {
          showFeedback('error', 'No se pudo eliminar el bloque', result.error);
          // Restore on failure
          setBloques((prev) => [deletedBloque, ...prev]);
          return;
        }
        
        showFeedback('success', 'Bloque eliminado', 'El bloque fue eliminado correctamente.');
      });
      return;
    }

    await runDelete(pendingDelete.actividad.id, async () => {
      // Optimistic: remove immediately from UI
      const deletedActividad = pendingDelete.actividad;
      setActividades((prev) => prev.filter((a) => a.id !== deletedActividad.id));
      setPendingDelete(null);
      
      // Call delete API
      const result = await deleteActividad(deletedActividad.id);
      if (!result.ok) {
        showFeedback('error', 'No se pudo eliminar la actividad', result.error);
        // Restore on failure
        setActividades((prev) => [deletedActividad, ...prev]);
        return;
      }
      
      showFeedback('success', 'Actividad eliminada', 'La actividad fue eliminada correctamente.');
    });
  };

  const renderParcial = ({ item, index }: { item: Parcial; index: number }) => {
    const selected = item.id === selectedParcialId;
    const pesoActual = roundTo2(Number(item.peso_porcentaje ?? 0));
    const resumenParcial = resumenParcialById[item.id];
    const seleccionarParcial = () => {
      if (item.id === selectedParcialId) {
        return;
      }
      setSelectedParcialId(item.id);
      setInitialActividadesLoaded(false);
      setLoadingActividades(true);
    };

    return (
      <View
        className={`mb-3 rounded-2xl border-[3px] px-4 py-3 ${
          selected ? 'border-black bg-[#D7ECFF]' : 'border-black bg-[#FFF7E8]'
        }`}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            onPress={seleccionarParcial}
            className="flex-1 pr-2"
          >
            <CustomText className="text-base font-black text-black">
              {item.nombre?.trim() || `Parcial ${index + 1}`}
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            disabled={isDeletingById(item.id)}
            onPress={() => setPendingDelete({ kind: 'parcial', parcial: item })}
            className="rounded-full border-[3px] border-black bg-[#FFC9C2] px-3 py-1"
          >
            <CustomText className="text-xs font-black text-black">
              {isDeletingById(item.id) ? '...' : 'Eliminar'}
            </CustomText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={seleccionarParcial}
          className="mt-3 rounded-2xl border-[3px] border-black bg-white px-3 py-2"
        >
          <CustomText className="text-xs font-black uppercase tracking-wide text-[#7A6857]">Valor por parcial</CustomText>
          <View className="mt-2">
            <CustomText className="text-sm font-black text-black">{pesoActual}%</CustomText>
            <CustomText className="mt-1 text-xs text-[#5E5045]">(ajustado automáticamente)</CustomText>
            <CustomText className="mt-1 text-xs font-bold text-[#5E5045]">
              Bloques: {resumenParcial?.bloques ?? 0} • Actividades: {resumenParcial?.actividades ?? 0}
            </CustomText>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderActividad = ({ item, index }: { item: Actividad; index: number }) => {
    const tipoLabel = item.tipo === 'examen' ? 'EXAMEN' : 'CORTE';
    const chipColor = item.tipo === 'examen' ? 'bg-[#FFD98E]' : 'bg-[#BDE9C7]';

    return (
      <View className="mb-3">
        <View className="rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <CustomText className="text-base font-black text-black">
                {item.nombre?.trim() || `Actividad ${index + 1}`}
              </CustomText>
              <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
                Peso: {roundTo2(Number(item.peso_porcentaje ?? 0))} pts
              </CustomText>
            </View>

            <View className="items-end gap-2">
              <View className={`rounded-full border-[3px] border-black px-3 py-1 ${chipColor}`}>
                <CustomText className="text-xs font-black text-black">{tipoLabel}</CustomText>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={isDeletingById(item.id)}
                onPress={() => setPendingDelete({ kind: 'actividad', actividad: item })}
                className="rounded-full border-[3px] border-black bg-[#FFC9C2] px-3 py-1"
              >
                <CustomText className="text-xs font-black text-black">
                  {isDeletingById(item.id) ? '...' : 'Eliminar'}
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
      <AlertModal
        visible={feedbackModal.visible}
        payload={feedbackModal.payload}
        onClose={closeFeedback}
      />

      <NameFormModal
        visible={createParcialVisible}
        title="Nuevo parcial"
        helperText="Ejemplo: 1er Parcial, 2do Parcial o Parcial Único."
        label="Nombre del parcial"
        placeholder="Ej: 1er Parcial"
        submitLabel="Crear parcial"
        submitting={creatingParcial}
        maxLength={50}
        onClose={() => {
          if (!creatingParcial) {
            setCreateParcialVisible(false);
          }
        }}
        onSubmit={crearNuevoParcial}
      />

      <NameFormModal
        visible={createBloqueVisible}
        title="Nuevo bloque"
        helperText="Crea un bloque para organizar actividades dentro del parcial seleccionado."
        label="Nombre del bloque"
        placeholder="Ej: Unidad 1"
        submitLabel="Crear bloque"
        submitting={creatingBloque}
        maxLength={100}
        onClose={() => {
          if (!creatingBloque) {
            setCreateBloqueVisible(false);
          }
        }}
        onSubmit={crearNuevoBloque}
      />

      <ActividadFormModal
        visible={createActividadVisible}
        submitting={creatingActividad}
        puntosDisponibles={puntosDisponibles}
        onClose={() => {
          if (!creatingActividad) {
            setCreateActividadVisible(false);
          }
        }}
        onSubmit={crearNuevaActividad}
      />

      <ConfirmActionModal
        visible={!!pendingDelete}
        title={
          pendingDelete?.kind === 'parcial'
            ? 'Eliminar parcial'
            : pendingDelete?.kind === 'bloque'
              ? 'Eliminar bloque'
              : 'Eliminar actividad'
        }
        message={pendingDelete
          ? pendingDelete.kind === 'parcial'
            ? `¿Seguro que deseas eliminar "${pendingDelete.parcial.nombre}"?`
            : pendingDelete.kind === 'bloque'
              ? `¿Seguro que deseas eliminar "${pendingDelete.bloque.nombre}"?`
              : `¿Seguro que deseas eliminar "${pendingDelete.actividad.nombre}"?`
          : ''}
        confirmLabel="Eliminar"
        loading={pendingDelete ? isDeletingById(
          pendingDelete.kind === 'parcial' ? pendingDelete.parcial.id : pendingDelete.kind === 'bloque' ? pendingDelete.bloque.id : pendingDelete.actividad.id
        ) : false}
        onCancel={() => {
          if (pendingDelete && isDeletingById(
            pendingDelete.kind === 'parcial' ? pendingDelete.parcial.id : pendingDelete.kind === 'bloque' ? pendingDelete.bloque.id : pendingDelete.actividad.id
          )) {
            return;
          }
          setPendingDelete(null);
        }}
        onConfirm={() => {
          void confirmarEliminar();
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

            <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Configurar notas</CustomText>
            <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
              {`${carrera.nombre} • ${anio.nombre} • ${asignatura.nombre}`}
            </CustomText>
            <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">Grupo: {grupo.nombre}</CustomText>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 overflow-hidden rounded-[34px] border-[4px] border-black bg-[#F7F0E4]">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <CustomText className="text-sm font-black text-black">Configuración de parciales y actividades</CustomText>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
            }}
          >
            <View className="px-5 pb-8 pt-3">
                <View className="relative mb-4">
                  <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
                  <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-4">
                    <View className="mb-3 flex-row items-center justify-between">
                      <CustomText className="text-lg font-black text-black">Parciales del grupo</CustomText>

                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.9}
                        disabled={creatingParcial}
                        onPress={() => setCreateParcialVisible(true)}
                        className="rounded-xl border-[3px] border-black bg-[#FFD98E] px-3 py-2 pl-1"
                      >
                        <CustomText className="text-xs font-black text-black">+ Nuevo parcial</CustomText>
                      </TouchableOpacity>
                    </View>

                    <View className="mb-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                      <CustomText className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                        Avance de parciales del grupo
                      </CustomText>
                      <CustomText className="mt-1 text-sm font-bold text-[#5E5045]">
                        Suma actual: {sumaParciales} / 100
                      </CustomText>
                      <CustomText className="mt-1 text-sm font-bold text-[#5E5045]">
                        Disponible: {pesoParcialesDisponible}
                      </CustomText>
                      <View className="mt-2 self-start rounded-full border-[3px] border-black bg-[#D7ECFF] px-3 py-1">
                        <CustomText className="text-xs font-black text-black">
                          {parcialesCompletos ? 'Parciales configurados al 100%' : 'Parciales incompletos'}
                        </CustomText>
                      </View>
                    </View>

                    {parciales.length > 0 ? (
                      parciales.map((item, index) => (
                        <View key={item.id}>{renderParcial({ item, index })}</View>
                      ))
                    ) : (
                      <CustomText className="text-sm font-semibold text-[#5E5045]">
                        Aún no hay parciales. Crea al menos uno para empezar a configurar actividades.
                      </CustomText>
                    )}
                  </View>
                </View>

                <View className="relative">
                  <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
                  <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-4">
                    <CustomText className="text-lg font-black text-black">Actividades del parcial seleccionado</CustomText>

                    {!parcialSeleccionado ? (
                      <CustomText className="mt-3 text-sm font-semibold text-[#5E5045]">
                        Selecciona o crea un parcial para comenzar.
                      </CustomText>
                    ) : (
                      <>
                        <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                          <CustomText className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                            Bloques del parcial
                          </CustomText>

                          {bloques.length > 0 ? (
                            <View className="mt-2 gap-2">
                              {bloques.map((bloque) => {
                                const active = bloque.id === selectedBloqueId;
                                const peso = roundTo2(Number(bloque.peso_porcentaje ?? 0));
                                return (
                                  <View key={bloque.id} className="flex-row items-center gap-2">
                                    <TouchableOpacity
                                      accessibilityRole="button"
                                      activeOpacity={0.9}
                                      onPress={() => {
                                        if (bloque.id !== selectedBloqueId) {
                                          setSelectedBloqueId(bloque.id);
                                          setInitialActividadesLoaded(false);
                                          setLoadingActividades(true);
                                        }
                                      }}
                                      className={`rounded-full border-[3px] px-3 py-1 ${
                                        active ? 'border-black bg-[#D7ECFF]' : 'border-black bg-[#F3E7D5]'
                                      }`}
                                    >
                                      <CustomText className="text-xs font-black text-black">
                                        {(bloque.nombre?.trim() || 'Bloque')} ({peso}%)
                                      </CustomText>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      accessibilityRole="button"
                                      activeOpacity={0.9}
                                      disabled={isDeletingById(bloque.id)}
                                      onPress={() => setPendingDelete({ kind: 'bloque', bloque })}
                                      className="rounded-full border-[3px] border-black bg-[#FFC9C2] px-3 py-1"
                                    >
                                      <CustomText className="text-xs font-black text-black">
                                        {isDeletingById(bloque.id) ? '...' : 'Eliminar'}
                                      </CustomText>
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                            </View>
                          ) : (
                            <CustomText className="mt-2 text-sm font-semibold text-[#5E5045]">
                              Este parcial aún no tiene bloques.
                            </CustomText>
                          )}

                          <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.9}
                            disabled={creatingBloque}
                            onPress={() => {
                              setCreateBloqueVisible(true);
                            }}
                            className="mt-3 self-start rounded-xl border-[3px] border-black bg-[#FFD98E] px-4 py-2"
                          >
                            <CustomText className="text-sm font-black text-black">+ Nuevo bloque</CustomText>
                          </TouchableOpacity>
                        </View>

                        <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                          <CustomText className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                            Bloque seleccionado
                          </CustomText>
                          <CustomText className="mt-1 text-base font-black text-black">
                            {bloqueSeleccionado?.nombre ?? 'Sin bloque seleccionado'}
                          </CustomText>

                          <CustomText className="mt-2 text-sm font-bold text-[#5E5045]">
                            Suma actual: {sumaActual} / 100
                          </CustomText>
                          <CustomText className="mt-1 text-sm font-bold text-[#5E5045]">
                            Puntos disponibles: {puntosDisponibles}
                          </CustomText>

                          <View className="mt-3 self-start rounded-full border-[3px] border-black bg-[#D7ECFF] px-3 py-1">
                            <CustomText className="text-xs font-black text-black">
                              {estadoCompletado ? 'Configurado al 100%' : 'Incompleto'}
                            </CustomText>
                          </View>
                        </View>

                        {bloques.length === 0 ? (
                          <CustomText className="mt-3 text-sm font-bold text-[#1E140D]">
                            Primero crea un bloque para habilitar el registro de actividades.
                          </CustomText>
                        ) : !estadoCompletado ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.9}
                            disabled={creatingActividad || !parcialSeleccionado || !selectedBloqueId}
                            onPress={() => setCreateActividadVisible(true)}
                            className="mt-3 self-start rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
                          >
                            <CustomText className="text-sm font-black text-black">+ Agregar actividad</CustomText>
                          </TouchableOpacity>
                        ) : (
                          <CustomText className="mt-3 text-sm font-bold text-[#1E140D]">
                            Este parcial ya llegó a 100 puntos. Si necesitas puntos de reserva, crea otro parcial.
                          </CustomText>
                        )}

                        {loadingActividades ? (
                          <View className="mt-4 gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <View key={`sk-${i}`} className="rounded-2xl border-[3px] border-[#DCCEC2] bg-[#FFFdf8] px-4 py-3 flex-row items-center justify-between">
                                <View className="flex-1">
                                  <InlineSkeleton width={120} height={20} />
                                  <InlineSkeleton width={80} height={16} />
                                </View>
                                <InlineSkeleton width={60} height={24} />
                              </View>
                            ))}
                          </View>
                        ) : actividades.length > 0 ? (
                          <View className="mt-4">
                            {actividades.map((item, index) => (
                              <View key={item.id}>{renderActividad({ item, index })}</View>
                            ))}
                          </View>
                        ) : (
                          <CustomText className="mt-4 text-sm font-semibold text-[#5E5045]">
                            No hay actividades configuradas aún en este parcial.
                          </CustomText>
                        )}
                      </>
                    )}
                  </View>
                </View>
              </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
