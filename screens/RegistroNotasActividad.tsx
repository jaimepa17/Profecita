import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { BREAKPOINTS } from '@/lib/constants/breakpoints';
import { listCarreras, type Carrera } from '@/lib/services/carrerasService';
import { listAnios, type Anio } from '@/lib/services/aniosService';
import { listAsignaturas, type Asignatura } from '@/lib/services/asignaturasService';
import { listGrupos, type Grupo } from '@/lib/services/gruposService';
import { listParcialesByGrupo } from '@/lib/services/parcialesService';
import { listBloquesByParcial } from '@/lib/services/bloquesService';
import { listActividadesByBloque, type Actividad } from '@/lib/services/actividadesService';
import { listEstudiantes, type Estudiante } from '@/lib/services/estudiantesService';
import { listGrupoEstudiantesByGrupo } from '@/lib/services/grupoEstudiantesService';
import { listNotasByActividad, createNota, updateNota, type Nota } from '@/lib/services/notasService';
import EstudianteNotaCard from '@/components/EstudianteNotaCard';
import AlertModal, { type AlertModalPayload, type AlertModalType } from '@/components/AlertModal';
import { InlineSkeleton } from '@/components/InlineSkeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegistroNotasActividad'>;

type ItemChip = {
  id: string;
  nombre: string;
};

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

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeNumberInput(raw: string): string {
  return raw.replace(/[^0-9.,]/g, '');
}

export default function RegistroNotasActividad() {
  const navigation = useNavigation<NavigationProp>();
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();

  const columnsCount = useMemo(() => {
    if (!isWeb) return 1;
    if (windowWidth < BREAKPOINTS.mobile) return 1;
    if (windowWidth < BREAKPOINTS.tablet) return 2;
    return 3;
  }, [isWeb, windowWidth]);

  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [anios, setAnios] = useState<Anio[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
  const [selectedActividadId, setSelectedActividadId] = useState<string | null>(null);
  const [filtroGrupo, setFiltroGrupo] = useState('');

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [estudiantesGrupo, setEstudiantesGrupo] = useState<Estudiante[]>([]);
  const [notasActividad, setNotasActividad] = useState<Nota[]>([]);
  const [inputsByStudentId, setInputsByStudentId] = useState<Record<string, string>>({});

  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingGrupoData, setLoadingGrupoData] = useState(false);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllProgress, setSaveAllProgress] = useState({ actual: 0, total: 0 });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  const actividadSeleccionada = useMemo(
    () => actividades.find((item) => item.id === selectedActividadId) ?? null,
    [actividades, selectedActividadId]
  );

  const grupoSeleccionado = useMemo(
    () => grupos.find((item) => item.id === selectedGrupoId) ?? null,
    [grupos, selectedGrupoId]
  );

  const asignaturaSeleccionada = useMemo(
    () =>
      grupoSeleccionado
        ? asignaturas.find((item) => item.id === grupoSeleccionado.asignatura_id) ?? null
        : null,
    [asignaturas, grupoSeleccionado]
  );

  const anioSeleccionado = useMemo(
    () =>
      asignaturaSeleccionada
        ? anios.find((item) => item.id === asignaturaSeleccionada.anio_id) ?? null
        : null,
    [anios, asignaturaSeleccionada]
  );

  const carreraSeleccionada = useMemo(
    () =>
      anioSeleccionado
        ? carreras.find((item) => item.id === anioSeleccionado.carrera_id) ?? null
        : null,
    [carreras, anioSeleccionado]
  );

  const notasByStudentId = useMemo(
    () => new Map(notasActividad.map((nota) => [nota.estudiante_id, nota])),
    [notasActividad]
  );

  const studentsScrollRef = useRef<ScrollView | null>(null);
  const outerScrollRef = useRef<ScrollView | null>(null);
  const studentYByIdRef = useRef<Record<string, number>>({});
  const [studentsSectionY, setStudentsSectionY] = useState<number | null>(null);

  const maxPuntajeActividad = roundTo2(Number(actividadSeleccionada?.peso_porcentaje ?? 100));

  const cargarBase = useCallback(async () => {
    setLoadingBase(true);
    const [carrerasResult, aniosResult, asignaturasResult, gruposResult] = await Promise.all([
      listCarreras(),
      listAnios(),
      listAsignaturas(),
      listGrupos(),
    ]);

    if (!carrerasResult.ok) {
      showFeedback('error', 'No se pudieron cargar las carreras', carrerasResult.error);
      setCarreras([]);
      setLoadingBase(false);
      return;
    }

    if (!aniosResult.ok) {
      showFeedback('error', 'No se pudieron cargar los años', aniosResult.error);
      setAnios([]);
      setLoadingBase(false);
      return;
    }

    if (!asignaturasResult.ok) {
      showFeedback('error', 'No se pudieron cargar las asignaturas', asignaturasResult.error);
      setAsignaturas([]);
      setLoadingBase(false);
      return;
    }

    if (!gruposResult.ok) {
      showFeedback('error', 'No se pudieron cargar los grupos', gruposResult.error);
      setGrupos([]);
      setLoadingBase(false);
      return;
    }

    setCarreras(carrerasResult.data);
    setAnios(aniosResult.data);
    setAsignaturas(asignaturasResult.data);
    setGrupos(gruposResult.data);

    setSelectedGrupoId((prev) => {
      if (prev && gruposResult.data.some((item) => item.id === prev)) {
        return prev;
      }
      return gruposResult.data[0]?.id ?? null;
    });
    setLoadingBase(false);
  }, [showFeedback]);

  const cargarGrupoData = useCallback(async (grupoId: string) => {
    setLoadingGrupoData(true);

    const [parcialesResult, grupoEstudiantesResult, estudiantesResult] = await Promise.all([
      listParcialesByGrupo(grupoId),
      listGrupoEstudiantesByGrupo(grupoId),
      listEstudiantes(),
    ]);

    if (!parcialesResult.ok) {
      showFeedback('error', 'No se pudieron cargar los parciales del grupo', parcialesResult.error);
      setActividades([]);
      setSelectedActividadId(null);
      setLoadingGrupoData(false);
      return;
    }

    if (!grupoEstudiantesResult.ok) {
      showFeedback('error', 'No se pudo cargar la matrícula del grupo', grupoEstudiantesResult.error);
      setEstudiantesGrupo([]);
      setLoadingGrupoData(false);
      return;
    }

    if (!estudiantesResult.ok) {
      showFeedback('error', 'No se pudieron cargar los estudiantes', estudiantesResult.error);
      setEstudiantesGrupo([]);
      setLoadingGrupoData(false);
      return;
    }

    const parciales = parcialesResult.data;

    const bloquesByParcial = await Promise.all(
      parciales.map(async (parcial) => {
        const bloquesResult = await listBloquesByParcial(parcial.id);
        return bloquesResult.ok ? bloquesResult.data : [];
      })
    );

    const bloques = bloquesByParcial.flat();

    const actividadesByBloque = await Promise.all(
      bloques.map(async (bloque) => {
        const actividadesResult = await listActividadesByBloque(bloque.id);
        return actividadesResult.ok ? actividadesResult.data : [];
      })
    );

    const actividadesFlatten = actividadesByBloque
      .flat()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    setActividades(actividadesFlatten);
    setSelectedActividadId((prev) => {
      if (prev && actividadesFlatten.some((item) => item.id === prev)) {
        return prev;
      }
      return actividadesFlatten[0]?.id ?? null;
    });

    const studentIds = new Set(grupoEstudiantesResult.data.map((item) => item.estudiante_id));
    const estudiantesFiltrados = estudiantesResult.data
      .filter((item) => studentIds.has(item.id))
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

    setEstudiantesGrupo(estudiantesFiltrados);
    setInputsByStudentId({});
    setLoadingGrupoData(false);
  }, [showFeedback]);

  const cargarNotasActividad = useCallback(async (actividadId: string) => {
    setLoadingNotas(true);

    const result = await listNotasByActividad(actividadId);
    if (!result.ok) {
      showFeedback('error', 'No se pudieron cargar las notas de la actividad', result.error);
      setNotasActividad([]);
      setInputsByStudentId({});
      setLoadingNotas(false);
      return;
    }

    const notas = result.data;
    setNotasActividad(notas);

    const map: Record<string, string> = {};
    notas.forEach((nota) => {
      map[nota.estudiante_id] = String(nota.puntaje_obtenido);
    });
    setInputsByStudentId(map);
    setLoadingNotas(false);
  }, [showFeedback]);

  useEffect(() => {
    void cargarBase();
  }, [cargarBase]);

  useEffect(() => {
    if (!selectedGrupoId) {
      setActividades([]);
      setSelectedActividadId(null);
      setEstudiantesGrupo([]);
      setNotasActividad([]);
      setInputsByStudentId({});
      return;
    }

    void cargarGrupoData(selectedGrupoId);
  }, [selectedGrupoId, cargarGrupoData]);

  useEffect(() => {
    if (!selectedActividadId) {
      setNotasActividad([]);
      return;
    }

    void cargarNotasActividad(selectedActividadId);
  }, [selectedActividadId, cargarNotasActividad]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onNotaSaved = useCallback(
    (estudianteId: string, nota: Nota | null) => {
      if (nota) {
        setNotasActividad((prev) =>
          prev.some((n) => n.estudiante_id === estudianteId)
            ? prev.map((n) => (n.estudiante_id === estudianteId ? nota : n))
            : [...prev, nota]
        );
        setInputsByStudentId((prev) => ({
          ...prev,
          [estudianteId]: String(nota.puntaje_obtenido),
        }));
      } else {
        setNotasActividad((prev) => prev.filter((n) => n.estudiante_id !== estudianteId));
        setInputsByStudentId((prev) => {
          const next = { ...prev };
          delete next[estudianteId];
          return next;
        });
      }
    },
    []
  );

  const onInputChange = useCallback((estudianteId: string, value: string) => {
    const clean = normalizeNumberInput(value);
    setInputsByStudentId((prev) => ({ ...prev, [estudianteId]: clean }));
  }, []);

  const onStudentInputFocus = useCallback((estudianteId: string) => {
    if (isWeb) {
      return;
    }

    if (typeof studentsSectionY === 'number') {
      outerScrollRef.current?.scrollTo({
        y: Math.max(0, studentsSectionY - 14),
        animated: true,
      });
    }

    const y = studentYByIdRef.current[estudianteId];
    if (typeof y !== 'number') {
      return;
    }

    const innerTopPadding = isAndroid ? 88 : 56;

    setTimeout(() => {
      studentsScrollRef.current?.scrollTo({
        y: Math.max(0, y - innerTopPadding),
        animated: true,
      });
    }, 120);
  }, [isAndroid, isWeb, studentsSectionY]);

  const guardarTodos = async () => {
    if (!actividadSeleccionada) {
      showFeedback('warning', 'Selecciona una actividad', 'Debes elegir una actividad para registrar notas.');
      return;
    }

    const estudiantesConNotas = estudiantesGrupo.filter((est) => {
      const raw = (inputsByStudentId[est.id] ?? '').trim();
      return raw.length > 0;
    });

    if (estudiantesConNotas.length === 0) {
      showFeedback('warning', 'Sin notas', 'Ingresa notas para al menos un estudiante antes de guardar todos.');
      return;
    }

    setIsSavingAll(true);
    setSaveAllProgress({ actual: 0, total: estudiantesConNotas.length });

    let guardadosExitoso = 0;
    let erroresTotal = 0;

    for (let i = 0; i < estudiantesConNotas.length; i++) {
      const estudiante = estudiantesConNotas[i];

      const raw = (inputsByStudentId[estudiante.id] ?? '').trim();
      const parsed = Number(raw.replace(',', '.'));

      if (Number.isNaN(parsed) || parsed < 0 || parsed > maxPuntajeActividad) {
        erroresTotal++;
        setSaveAllProgress((prev) => ({ ...prev, actual: i + 1 }));
        continue;
      }

      const puntaje = roundTo2(parsed);
      const notaExistente = notasByStudentId.get(estudiante.id);

      try {
        if (!notaExistente) {
          const createResult = await createNota({
            actividad_id: actividadSeleccionada.id,
            estudiante_id: estudiante.id,
            puntaje_obtenido: puntaje,
          });
          if (createResult.ok) {
            guardadosExitoso++;
          } else {
            erroresTotal++;
          }
        } else {
          const updateResult = await updateNota(notaExistente.id, {
            puntaje_obtenido: puntaje,
          });
          if (updateResult.ok) {
            guardadosExitoso++;
          } else {
            erroresTotal++;
          }
        }
      } catch (error) {
        erroresTotal++;
      }

      setSaveAllProgress((prev) => ({ ...prev, actual: i + 1 }));
    }

    await cargarNotasActividad(actividadSeleccionada.id);
    setIsSavingAll(false);
    setSaveAllProgress({ actual: 0, total: 0 });

    if (erroresTotal === 0) {
      showFeedback('success', '¡Listo!', `Se guardaron exitosamente ${guardadosExitoso} nota(s).`);
    } else {
      showFeedback(
        'warning',
        'Guardado parcial',
        `Se guardaron ${guardadosExitoso} nota(s). Hubo ${erroresTotal} error(es) o datos inválidos.`
      );
    }
  };

  const renderChip = (
    label: string,
    items: ItemChip[],
    selectedId: string | null,
    onSelect: (id: string) => void,
    emptyText: string
  ) => (
    <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
      <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">{label}</Text>
      {items.length === 0 ? (
        <Text className="mt-2 text-sm font-semibold text-[#5E5045]">{emptyText}</Text>
      ) : (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {items.map((item) => {
            const active = item.id === selectedId;
            return (
              <TouchableOpacity
                key={item.id}
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => onSelect(item.id)}
                className={`rounded-full border-[3px] px-3 py-1 ${
                  active ? 'border-black bg-[#D7ECFF]' : 'border-black bg-[#F3E7D5]'
                }`}
              >
                <Text className="text-xs font-black text-black">{item.nombre}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const gruposFiltrados = useMemo(() => {
    const query = filtroGrupo.trim().toLowerCase();
    if (!query) {
      return grupos;
    }

    return grupos.filter((item) => item.nombre.toLowerCase().includes(query));
  }, [grupos, filtroGrupo]);

  const grupoItems = gruposFiltrados.map((item) => ({ id: item.id, nombre: item.nombre }));
  const actividadItems = actividades.map((item) => ({
    id: item.id,
    nombre: `${item.nombre} (${roundTo2(Number(item.peso_porcentaje ?? 0))} pts)`,
  }));

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <AlertModal
        visible={feedbackModal.visible}
        payload={feedbackModal.payload}
        onClose={closeFeedback}
      />

      <View className="relative mb-3 px-1">
        <View className="relative">
          <View className="absolute inset-0 translate-x-1 translate-y-1.5 rounded-[24px] bg-black" />
          <View className="rounded-[24px] border-[4px] border-black bg-[#EBD7BF] px-4 py-3">
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={navigation.goBack}
              className="self-start rounded-full border-[3px] border-black bg-white px-3 py-1"
            >
              <Text className="text-xs font-black text-black">← Volver</Text>
            </TouchableOpacity>

            <Text className="mt-2 text-xl font-black text-[#1E140D]">
              Registrar notas por actividad
            </Text>
            <Text className="mt-1 text-xs font-semibold text-[#5E5045]">
              Calificación rápida por estudiante.
            </Text>
          </View>
        </View>
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-x-0 bottom-[-4px] h-[5px] rounded-full bg-black/90" />
        <View className="flex-1 overflow-hidden rounded-[34px] border-[4px] border-black bg-[#F7F0E4]">
          <PaperGrid />

          {loadingBase ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <ScrollView
              ref={outerScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: keyboardHeight > 0 ? keyboardHeight + 180 : 140,
              }}
            >
              <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
                <Text className="text-sm font-black text-black">Flujo: Grupo → Actividad → Notas</Text>
              </View>

              <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">Buscar grupo</Text>
                <TextInput
                  value={filtroGrupo}
                  onChangeText={setFiltroGrupo}
                  placeholder="Ej: Grupo B1"
                  placeholderTextColor="#9F8B78"
                  className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2 text-base font-bold text-black"
                />
              </View>

              {renderChip(
                'Grupo',
                grupoItems,
                selectedGrupoId,
                setSelectedGrupoId,
                'No hay grupos registrados con ese criterio.'
              )}

              {grupoSeleccionado ? (
                <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                  <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    Contexto del grupo
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-[#5E5045]">
                    Carrera: {carreraSeleccionada?.nombre ?? 'Sin carrera'}
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-[#5E5045]">
                    Año: {anioSeleccionado?.nombre ?? 'Sin año'}
                  </Text>
                  <Text className="mt-1 text-sm font-bold text-[#5E5045]">
                    Asignatura: {asignaturaSeleccionada?.nombre ?? 'Sin asignatura'}
                  </Text>
                </View>
              ) : null}

              {loadingGrupoData ? (
                <View className="mt-3 rounded-2xl border-[3px] border-[#DCCEC2] bg-[#FFFdf8] px-4 py-3 flex-row flex-wrap gap-2">
                   <InlineSkeleton width={80} height={24} />
                   <InlineSkeleton width={120} height={24} />
                   <InlineSkeleton width={90} height={24} />
                </View>
              ) : (
                renderChip(
                  'Actividad',
                  actividadItems,
                  selectedActividadId,
                  setSelectedActividadId,
                  'Este grupo no tiene actividades disponibles.'
                )
              )}

              {actividadSeleccionada ? (
                <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                  <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    Actividad seleccionada
                  </Text>
                  <Text className="mt-1 text-base font-black text-black">{actividadSeleccionada.nombre}</Text>
                  <Text className="mt-1 text-sm font-bold text-[#5E5045]">
                    Puntaje máximo: {maxPuntajeActividad}
                  </Text>
                </View>
              ) : null}

              {loadingNotas ? (
                <View className="mt-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <View key={`sk-${i}`} className="rounded-2xl border-[3px] border-[#DCCEC2] bg-[#FFFdf8] px-4 py-3 flex-row items-center justify-between">
                      <View className="flex-1">
                        <InlineSkeleton width={`${Math.floor(Math.random() * 30 + 40)}%`} height={20} />
                      </View>
                      <InlineSkeleton width={80} height={28} />
                    </View>
                  ))}
                </View>
              ) : actividadSeleccionada && estudiantesGrupo.length > 0 ? (
                <View
                  className="mt-4 overflow-hidden rounded-2xl border-[3px] border-black bg-[#F5EADB]"
                  onLayout={(event) => {
                    setStudentsSectionY(event.nativeEvent.layout.y);
                  }}
                >
                  <ScrollView
                    ref={studentsScrollRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    stickyHeaderIndices={[0]}
                    style={{ maxHeight: keyboardHeight > 0 ? 360 : columnsCount === 1 ? 420 : 520 }}
                    contentContainerStyle={{
                      paddingHorizontal: 10,
                      paddingTop: 0,
                      paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 12,
                      gap: 10,
                    }}
                  >
                    {isAndroid || columnsCount === 1 ? (
                      <View className="mx-[-10px] border-b-[3px] border-black bg-[#FFF7E8] px-3 py-2">
                        <Text className="text-sm font-black text-[#1E140D]">
                          Estudiantes del grupo ({estudiantesGrupo.length})
                        </Text>

                        <TouchableOpacity
                          accessibilityRole="button"
                          activeOpacity={0.9}
                          disabled={isSavingAll}
                          onPress={() => {
                            void guardarTodos();
                          }}
                          className="mt-2 w-full rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
                        >
                          <Text className="text-center text-sm font-black text-black">
                            {isSavingAll ? `Guardando ${saveAllProgress.actual}/${saveAllProgress.total}` : 'Guardar todo'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="mx-[-10px] flex-row items-center justify-between border-b-[3px] border-black bg-[#FFF7E8] px-3 py-2">
                        <Text className="text-sm font-black text-[#1E140D]">
                          Estudiantes del grupo ({estudiantesGrupo.length})
                        </Text>

                        <TouchableOpacity
                          accessibilityRole="button"
                          activeOpacity={0.9}
                          disabled={isSavingAll}
                          onPress={() => {
                            void guardarTodos();
                          }}
                          className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
                        >
                          <Text className="text-sm font-black text-black">
                            {isSavingAll ? `Guardando ${saveAllProgress.actual}/${saveAllProgress.total}` : 'Guardar todo'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View className={isWeb ? 'flex-row flex-wrap -mx-1.5' : ''}>
                      {estudiantesGrupo.map((item) => {
                        const notaExistente = notasByStudentId.get(item.id);

                        return (
                          <View
                            key={item.id}
                            className={isWeb ? 'mb-3 px-1.5' : 'mb-3'}
                            style={isWeb ? { width: `${100 / columnsCount}%` } : { width: '100%' }}
                            onLayout={(event) => {
                              studentYByIdRef.current[item.id] = event.nativeEvent.layout.y;
                            }}
                          >
                            <EstudianteNotaCard
                              estudiante={item}
                              notaExistente={notaExistente}
                              actividadId={actividadSeleccionada.id}
                              maxPuntaje={maxPuntajeActividad}
                              initialInputValue={inputsByStudentId[item.id] ?? ''}
                              onInputChange={onInputChange}
                              onInputFocus={isWeb ? undefined : onStudentInputFocus}
                              onNotaSaved={onNotaSaved}
                              onFeedback={showFeedback}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              ) : actividadSeleccionada ? (
                <Text className="mt-4 text-sm font-semibold text-[#5E5045]">
                  Este grupo no tiene estudiantes matriculados.
                </Text>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
