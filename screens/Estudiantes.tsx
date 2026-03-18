import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import AlertModal, {
  type AlertModalPayload,
  type AlertModalType,
} from '@/components/AlertModal';
import LoadingScreen from '@/components/LoadingScreen';
import EstudianteFormModal, {
  type EstudianteGroupOption,
} from '@/components/EstudianteFormModal';
import { useKeyedSingleFlight, useSingleFlight } from '@/lib/hooks/useSingleFlight';
import { useRealtimeCollection } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { listCarreras, type Carrera } from '@/lib/services/carrerasService';
import { listAniosByCarrera, type Anio } from '@/lib/services/aniosService';
import {
  listAsignaturasByAnio,
  type Asignatura,
} from '@/lib/services/asignaturasService';
import { listGruposByAsignatura, type Grupo } from '@/lib/services/gruposService';
import {
  createEstudiante,
  deleteEstudiante,
  listEstudiantes,
  updateEstudiante,
  type Estudiante,
} from '@/lib/services/estudiantesService';
import {
  createGrupoEstudiante,
  deleteGrupoEstudiante,
  listGrupoEstudiantesByEstudiantes,
} from '@/lib/services/grupoEstudiantesService';

type EstudiantesScreenProps = {
  onBack: () => void;
};

type GrupoLookup = {
  grupo: Grupo;
  asignatura: Asignatura;
  anio: Anio;
  carrera: Carrera;
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

export default function EstudiantesScreen({ onBack }: EstudiantesScreenProps) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [realtimeUserId, setRealtimeUserId] = useState<string | null>(null);

  const [grupoOptions, setGrupoOptions] = useState<GrupoLookup[]>([]);
  const [groupIdsByStudent, setGroupIdsByStudent] = useState<Record<string, string[]>>({});
  const [groupLabelsByStudent, setGroupLabelsByStudent] = useState<Record<string, string[]>>({});
  const [loadingGrupoOptions, setLoadingGrupoOptions] = useState(true);
  const [createEstudianteVisible, setCreateEstudianteVisible] = useState(false);
  const [editingEstudiante, setEditingEstudiante] = useState<Estudiante | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Estudiante | null>(null);
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

  const { run: runCreate, isRunning: creating } = useSingleFlight();
  const { run: runUpdate, isRunning: updating } = useSingleFlight();
  const { run: runDelete, isRunning: isDeleting } = useKeyedSingleFlight<string>();

  const showFeedback = useCallback((type: AlertModalType, title: string, message: string) => {
    setFeedbackModal({
      visible: true,
      payload: {
        type,
        title,
        message,
      },
    });
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedbackModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const cargarEstudiantes = useCallback(async () => {
    // Solo mostrar loader si es la carga inicial
    if (!initialLoaded) {
      setLoading(true);
    }

    const result = await listEstudiantes();

    if (!result.ok) {
      showFeedback('error', 'No se pudieron cargar los estudiantes', result.error);
      setEstudiantes([]);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }

    setEstudiantes(result.data);
    setLoading(false);
    setInitialLoaded(true);
  }, [initialLoaded, showFeedback]);

  const cargarGruposLookup = useCallback(async () => {
    setLoadingGrupoOptions(true);

    const carrerasResult = await listCarreras();
    if (!carrerasResult.ok) {
      showFeedback('error', 'No se pudieron cargar las carreras', carrerasResult.error);
      setGrupoOptions([]);
      setLoadingGrupoOptions(false);
      return;
    }

    const lookup: GrupoLookup[] = [];

    for (const carrera of carrerasResult.data) {
      const aniosResult = await listAniosByCarrera(carrera.id);
      if (!aniosResult.ok) {
        continue;
      }

      for (const anio of aniosResult.data) {
        const asignaturasResult = await listAsignaturasByAnio(anio.id);
        if (!asignaturasResult.ok) {
          continue;
        }

        for (const asignatura of asignaturasResult.data) {
          const gruposResult = await listGruposByAsignatura(asignatura.id);
          if (!gruposResult.ok) {
            continue;
          }

          gruposResult.data.forEach((grupo) => {
            lookup.push({
              grupo,
              asignatura,
              anio,
              carrera,
            });
          });
        }
      }
    }

    lookup.sort((a, b) => {
      const aKey = `${a.carrera.nombre}|${a.anio.nombre}|${a.asignatura.nombre}|${a.grupo.nombre}`;
      const bKey = `${b.carrera.nombre}|${b.anio.nombre}|${b.asignatura.nombre}|${b.grupo.nombre}`;
      return aKey.localeCompare(bKey, 'es');
    });

    setGrupoOptions(lookup);
    setLoadingGrupoOptions(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      await Promise.all([cargarEstudiantes(), cargarGruposLookup()]);

      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      setRealtimeUserId(data.session?.user?.id ?? null);
    };

    void bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }
      setRealtimeUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [cargarEstudiantes, cargarGruposLookup]);

  useRealtimeCollection<Estudiante>({
    enabled: !!realtimeUserId,
    table: 'estudiantes',
    filter: realtimeUserId ? `profesor_id=eq.${realtimeUserId}` : undefined,
    channelName: `realtime:estudiantes:${realtimeUserId ?? 'anon'}`,
    setItems: setEstudiantes,
    onForegroundSync: cargarEstudiantes,
  });

  useEffect(() => {
    let mounted = true;

    const cargarGruposPorEstudiante = async () => {
      if (estudiantes.length === 0) {
        setGroupIdsByStudent({});
        setGroupLabelsByStudent({});
        setPageReady(true);
        return;
      }

      if (grupoOptions.length === 0) {
        setGroupIdsByStudent({});
        setGroupLabelsByStudent({});
        setPageReady(true);
        return;
      }

      const relacionesResult = await listGrupoEstudiantesByEstudiantes(
        estudiantes.map((item) => item.id)
      );

      if (!mounted) {
        return;
      }

      if (!relacionesResult.ok) {
        setGroupIdsByStudent({});
        setGroupLabelsByStudent({});
        return;
      }

      const contextByGroupId = grupoOptions.reduce<Record<string, string>>((acc, item) => {
        const title = `${item.grupo.nombre}${item.grupo.turno ? ` (${item.grupo.turno})` : ''}`;
        acc[item.grupo.id] = `${title} • ${item.carrera.nombre} • ${item.anio.nombre} • ${item.asignatura.nombre}`;
        return acc;
      }, {});

      const nextMap: Record<string, string[]> = {};
      const nextIdsMap: Record<string, string[]> = {};

      relacionesResult.data.forEach((relacion) => {
        const label = contextByGroupId[relacion.grupo_id];
        if (!nextIdsMap[relacion.estudiante_id]) {
          nextIdsMap[relacion.estudiante_id] = [];
        }
        if (!nextIdsMap[relacion.estudiante_id].includes(relacion.grupo_id)) {
          nextIdsMap[relacion.estudiante_id].push(relacion.grupo_id);
        }

        if (!label) {
          return;
        }

        if (!nextMap[relacion.estudiante_id]) {
          nextMap[relacion.estudiante_id] = [];
        }

        if (!nextMap[relacion.estudiante_id].includes(label)) {
          nextMap[relacion.estudiante_id].push(label);
        }
      });

      setGroupIdsByStudent(nextIdsMap);
      setGroupLabelsByStudent(nextMap);
      setPageReady(true);
    };

    void cargarGruposPorEstudiante();

    return () => {
      mounted = false;
    };
  }, [estudiantes, grupoOptions]);

  const selectorOptions = useMemo(
    () =>
      grupoOptions.map<EstudianteGroupOption>((item) => ({
        id: item.grupo.id,
        label: `${item.grupo.nombre}${item.grupo.turno ? ` (${item.grupo.turno})` : ''}`,
        description: `${item.carrera.nombre} • ${item.anio.nombre} • ${item.asignatura.nombre}`,
      })),
    [grupoOptions]
  );

  const openCreateEstudiante = () => {
    setCreateEstudianteVisible(true);
  };

  const closeCreateEstudiante = () => {
    if (creating) {
      return;
    }

    setCreateEstudianteVisible(false);
  };

  const crearYAsignarEstudiante = async (payload: {
    nombreCompleto: string;
    identificacion: string;
    grupoIds: string[];
  }) => {
    if (payload.grupoIds.length === 0) {
      showFeedback('warning', 'Falta grupo', 'Selecciona un grupo valido para asignar al estudiante.');
      return;
    }

    const selectedGroups = payload.grupoIds
      .map((id) => grupoOptions.find((item) => item.grupo.id === id))
      .filter((item): item is GrupoLookup => !!item);

    if (selectedGroups.length !== payload.grupoIds.length) {
      showFeedback('warning', 'Falta grupo', 'Selecciona un grupo valido para asignar al estudiante.');
      return;
    }

    await runCreate(async () => {
      const createResult = await createEstudiante({
        nombre_completo: payload.nombreCompleto,
        identificacion: payload.identificacion || null,
      });

      if (!createResult.ok) {
        showFeedback('error', 'No se pudo crear el estudiante', createResult.error);
        return;
      }

      for (const selectedGroup of selectedGroups) {
        const relationResult = await createGrupoEstudiante({
          estudiante_id: createResult.data.id,
          grupo_id: selectedGroup.grupo.id,
        });

        if (!relationResult.ok) {
          await deleteEstudiante(createResult.data.id);
          showFeedback('error', 'No se pudo asignar el estudiante', relationResult.error);
          return;
        }
      }

      // Realtime se encargará de agregar el estudiante automáticamente
      setCreateEstudianteVisible(false);
      showFeedback('success', 'Estudiante creado', 'Se creó y asignó a los grupos seleccionados correctamente.');
    });
  };

  const openEditEstudiante = (estudiante: Estudiante) => {
    setEditingEstudiante(estudiante);
  };

  const closeEditEstudiante = () => {
    if (updating) {
      return;
    }
    setEditingEstudiante(null);
  };

  const guardarEdicionEstudiante = async (payload: {
    nombreCompleto: string;
    identificacion: string;
    grupoIds: string[];
  }) => {
    if (!editingEstudiante) {
      return;
    }

    await runUpdate(async () => {
      const result = await updateEstudiante(editingEstudiante.id, {
        nombre_completo: payload.nombreCompleto,
        identificacion: payload.identificacion || null,
      });

      if (!result.ok) {
        showFeedback('error', 'No se pudo actualizar el estudiante', result.error);
        return;
      }

      const currentGroupIds = groupIdsByStudent[editingEstudiante.id] ?? [];
      const toAdd = payload.grupoIds.filter((id) => !currentGroupIds.includes(id));
      const toRemove = currentGroupIds.filter((id) => !payload.grupoIds.includes(id));

      for (const groupId of toAdd) {
        const addResult = await createGrupoEstudiante({
          estudiante_id: editingEstudiante.id,
          grupo_id: groupId,
        });

        if (!addResult.ok) {
          showFeedback('error', 'No se pudieron actualizar los grupos', addResult.error);
          return;
        }
      }

      for (const groupId of toRemove) {
        const removeResult = await deleteGrupoEstudiante(groupId, editingEstudiante.id);
        if (!removeResult.ok) {
          showFeedback('error', 'No se pudieron actualizar los grupos', removeResult.error);
          return;
        }
      }

      // Realtime se encargará de actualizar el estudiante automáticamente
      setEditingEstudiante(null);
      showFeedback('success', 'Estudiante actualizado', 'Los datos del estudiante se guardaron correctamente.');
    });
  };

  const eliminarEstudianteActual = async (estudiante: Estudiante) => {
    await runDelete(estudiante.id, async () => {
      const result = await deleteEstudiante(estudiante.id);
      if (!result.ok) {
        showFeedback('error', 'No se pudo eliminar el estudiante', result.error);
        return;
      }

      // Realtime se encargará de remover el estudiante automáticamente
      setPendingDelete(null);
    });
  };

  const renderEstudiante = ({ item, index }: { item: Estudiante; index: number }) => {
    const deleting = isDeleting(item.id);
    const studentGroups = groupLabelsByStudent[item.id] ?? [];

    return (
      <View className="mb-4">
        <View className="relative">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-black" />
          <View className="rounded-[24px] border-[3px] border-black bg-[#FDF9F1] p-5">
            <View className="rounded-full self-start border-[3px] border-black bg-[#D7ECFF] px-3 py-1">
              <Text className="text-xs font-black text-black">ESTUDIANTE</Text>
            </View>

            <Text className="mt-3 text-xl font-black text-black">
              {item.nombre_completo?.trim() || `Estudiante ${index + 1}`}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-[#6B5A4A]">
              {item.identificacion?.trim() || 'Sin identificación'}
            </Text>

            <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#7A6857]">
                Grupos
              </Text>

              {studentGroups.length > 0 ? (
                studentGroups.map((groupText, groupIndex) => (
                  <Text key={`${item.id}-group-${groupIndex}`} className="mt-1 text-sm font-semibold text-black">
                    {`• ${groupText}`}
                  </Text>
                ))
              ) : (
                <Text className="mt-1 text-sm font-semibold text-[#6B5A4A]">
                  Sin grupos asignados
                </Text>
              )}
            </View>

            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={updating}
                onPress={() => openEditEstudiante(item)}
                className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
              >
                <Text className="text-sm font-black text-black">Editar</Text>
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
    return <LoadingScreen message="Cargando estudiantes..." emoji="📚" />;
  }

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <AlertModal
        visible={feedbackModal.visible}
        payload={feedbackModal.payload}
        onClose={closeFeedback}
      />

      <EstudianteFormModal
        visible={createEstudianteVisible}
        submitting={creating}
        loadingGroups={loadingGrupoOptions}
        groupOptions={selectorOptions}
        initialGrupoIds={[]}
        onClose={closeCreateEstudiante}
        onSubmit={crearYAsignarEstudiante}
      />

      <EstudianteFormModal
        visible={!!editingEstudiante}
        submitting={updating}
        loadingGroups={loadingGrupoOptions}
        groupOptions={selectorOptions}
        mode="edit"
        title="Editar estudiante"
        helperText="Actualiza nombre, identificación y grupos del estudiante."
        submitLabel="Guardar cambios"
        requireGroup
        initialNombreCompleto={editingEstudiante?.nombre_completo ?? ''}
        initialIdentificacion={editingEstudiante?.identificacion ?? ''}
        initialGrupoIds={editingEstudiante ? (groupIdsByStudent[editingEstudiante.id] ?? []) : []}
        onClose={closeEditEstudiante}
        onSubmit={guardarEdicionEstudiante}
      />

      <ConfirmActionModal
        visible={!!pendingDelete}
        title="Eliminar estudiante"
        message={pendingDelete
          ? `¿Seguro que deseas eliminar \"${pendingDelete.nombre_completo}\"?`
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
          void eliminarEstudianteActual(pendingDelete);
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
            <Text className="mt-3 text-2xl font-black text-[#1E140D]">Estudiantes</Text>
            <Text className="mt-1 text-sm font-semibold text-[#5E5045]">
              Crea y asigna rápido desde una sola libreta.
            </Text>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 rounded-[34px] border-[4px] border-black bg-[#F7F0E4] overflow-hidden">
          <PaperGrid />

          <View className="px-5 pt-4">
            <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
              <Text className="text-sm font-black text-black">
                {`Estudiantes listados: ${estudiantes.length}`}
              </Text>
            </View>
          </View>

          <FlatList
            data={estudiantes}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderEstudiante}
            ListEmptyComponent={
              <View className="mt-8 items-center justify-center px-1">
                <View className="relative w-full">
                  <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[32px] bg-black" />
                  <View className="items-center rounded-[32px] border-[3px] border-black bg-[#FDF9F1] px-6 py-10">
                    <Text className="text-5xl">🧑‍🎓</Text>
                    <Text className="mt-4 text-center text-2xl font-black text-black">
                      Aun no hay estudiantes
                    </Text>
                    <Text className="mt-3 text-center text-base font-medium leading-6 text-[#5F5146]">
                      Crea tu primer estudiante y asignalo a un grupo para empezar la libreta.
                    </Text>

                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.9}
                      disabled={creating || loadingGrupoOptions}
                      onPress={openCreateEstudiante}
                      className="mt-6 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-6 py-4"
                    >
                      <Text className="text-base font-black text-black">
                        + Crear y asignar estudiante
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
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

          <View className="absolute -bottom-4 -right-2 rotate-[-16deg]">
            <Text className="text-5xl">🌿</Text>
          </View>
        </View>
      </View>

      {estudiantes.length > 0 ? (
        <View className="absolute bottom-7 left-6">
          <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black" />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            disabled={creating || loadingGrupoOptions}
            onPress={openCreateEstudiante}
            className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FFB6C9]"
          >
            <Text className="text-4xl font-black text-black">+</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
