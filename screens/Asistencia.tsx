import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomText } from '@/components/CustomText';
import { InlineSkeleton } from '@/components/InlineSkeleton';
import type { RootStackParamList } from '@/types/navigation';
import {
  type AsistenciaJustificacion,
  type AsistenciaRegistro,
  type AsistenciaSesion,
  createSesion,
  deleteSesion,
  getEstudiantesEnGrupo,
  getRegistrosByGrupo,
  listContextoGrupoByGrupoId,
  listJustificacionesByEstudiantes,
  listSesionesByGrupo,
  upsertRegistro,
} from '@/lib/services/asistenciaService';
import { listEstudiantesByIds, type Estudiante } from '@/lib/services/estudiantesService';
import { useRealtimeTable } from '@/lib/realtime';
import { useSingleFlight } from '@/lib/hooks/useSingleFlight';
import AsistenciaSesionesConfigModal from '@/components/AsistenciaSesionesConfigModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Asistencia'>;
type RouteProps = RouteProp<RootStackParamList, 'Asistencia'>;

type ContextoVista = {
  grupo_id: string;
  carrera_nombre: string;
  anio_nombre: string;
  asignatura_nombre: string;
  grupo_nombre: string;
  turno: string | null;
};

type RegistroByKey = Record<string, AsistenciaRegistro>;

const CELL_WIDTH_WEB = 52;
const CELL_WIDTH_MOBILE = 58;
const ROW_HEIGHT = 46;
const ASISTENCIA_GRUPO_CACHE_PREFIX = 'asistencia_grupo_cache:';
const ASISTENCIA_GRUPOS_CACHE_TTL_MS = 5 * 60 * 1000;

type CachePayload<T> = {
  savedAt: number;
  data: T;
};

function monthName(fecha: string): string {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleString('es-ES', { month: 'long' });
}

function shortDate(fecha: string): string {
  const parts = fecha.split('-');
  if (parts.length !== 3) return fecha;
  return `${parts[2]}/${parts[1]}`;
}

function keyRegistro(sesionId: string, estudianteId: string): string {
  return `${sesionId}::${estudianteId}`;
}

function estadoToUi(estado?: AsistenciaRegistro['estado']): { label: string; bg: string } {
  switch (estado) {
    case 'presente':
      return { label: 'P', bg: '#BDE9C7' };
    case 'justificado':
      return { label: 'J', bg: '#D7ECFF' };
    case 'tardanza':
      return { label: 'T', bg: '#FFE3A8' };
    default:
      return { label: 'A', bg: '#FFC9C2' };
  }
}

function nextEstadoMobile(estado?: AsistenciaRegistro['estado']): AsistenciaRegistro['estado'] {
  if (estado === 'presente') return 'ausente';
  return 'presente';
}

function countWeekdaysInMonth(year: number, month: number, weekday: number): number {
  let count = 0;
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    if (cursor.getDay() === weekday) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function pendingCellLabel(estado?: AsistenciaRegistro['estado']): string {
  if (estado === 'presente') {
    return 'P';
  }

  return 'A';
}

export default function AsistenciaScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const params = route.params;
  const { width } = useWindowDimensions();
  const isWeb = process.env.EXPO_OS === 'web';

  const [loading, setLoading] = useState(true);
  const [contexto, setContexto] = useState<ContextoVista | null>(() => {
    if (params?.grupo && params?.asignatura && params?.anio && params?.carrera) {
      return {
        grupo_id: params.grupo.id,
        carrera_nombre: params.carrera.nombre,
        anio_nombre: params.anio.nombre,
        asignatura_nombre: params.asignatura.nombre,
        grupo_nombre: params.grupo.nombre,
        turno: params.grupo.turno ?? null,
      };
    }
    return null;
  });

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [sesiones, setSesiones] = useState<AsistenciaSesion[]>([]);
  const [registrosMap, setRegistrosMap] = useState<RegistroByKey>({});
  const [justificaciones, setJustificaciones] = useState<AsistenciaJustificacion[]>([]);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [pendingDeleteSesionIds, setPendingDeleteSesionIds] = useState<Set<string>>(new Set());
  const [pendingRegistroKeys, setPendingRegistroKeys] = useState<Set<string>>(new Set());
  const contextoRef = useRef<ContextoVista | null>(contexto);
  const estudiantesIdsRef = useRef<Set<string>>(new Set());
  const sesionesIdsRef = useRef<Set<string>>(new Set());
  const loadingGroupIdsRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);
  const pendingGroupLoadRef = useRef<{ ctx: ContextoVista; options?: { silent?: boolean } } | null>(null);
  const pendingRegistroStartedAtRef = useRef<Record<string, number>>({});
  const pendingRegistroPrevRef = useRef<Record<string, AsistenciaRegistro | undefined>>({});
  const { run: runConfigSession, isRunning: configSaving } = useSingleFlight();

  useEffect(() => {
    contextoRef.current = contexto;
  }, [contexto]);

  useEffect(() => {
    sesionesIdsRef.current = new Set(sesiones.map((s) => s.id));
  }, [sesiones]);

  useEffect(() => {
    estudiantesIdsRef.current = new Set(estudiantes.map((e) => e.id));
  }, [estudiantes]);

  const cargarRegistrosPorSesiones = useCallback(
    async (grupoId: string, sesionesData: AsistenciaSesion[], estudiantesIds: string[]) => {
      if (sesionesData.length === 0 || estudiantesIds.length === 0) {
        setRegistrosMap({});
        return {} as RegistroByKey;
      }

      const result = await getRegistrosByGrupo(grupoId, estudiantesIds);
      if (!result.ok) {
        setRegistrosMap({});
        return {} as RegistroByKey;
      }

      const byKey: RegistroByKey = {};
      Object.values(result.data).forEach((registros) => {
        registros.forEach((r) => {
          byKey[keyRegistro(r.sesion_id, r.estudiante_id)] = r;
        });
      });
      setRegistrosMap(byKey);
      return byKey;
    },
    []
  );

  const cargarDatosGrupo = useCallback(
    async (ctx: ContextoVista, options?: { silent?: boolean }) => {
      const isSilent = !!options?.silent;
      if (fetchingRef.current) {
        pendingGroupLoadRef.current = { ctx, options };
        return;
      }

      const startedAt = Date.now();
      fetchingRef.current = true;
      const shouldShowLoading = !isSilent && !loadingGroupIdsRef.current.has(ctx.grupo_id);
      if (shouldShowLoading) {
        setLoading(true);
      }

      try {
        const cacheKey = `${ASISTENCIA_GRUPO_CACHE_PREFIX}${ctx.grupo_id}`;
        if (!isSilent) {
          try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached) as {
                savedAt: number;
                estudiantes: Estudiante[];
                sesiones: AsistenciaSesion[];
                justificaciones: AsistenciaJustificacion[];
                registrosMap: RegistroByKey;
              };

              const isFresh = Date.now() - Number(parsed.savedAt ?? 0) < ASISTENCIA_GRUPOS_CACHE_TTL_MS;
              if (isFresh) {
                if (contextoRef.current?.grupo_id !== ctx.grupo_id) {
                  return;
                }

                setEstudiantes(parsed.estudiantes ?? []);
                setSesiones(parsed.sesiones ?? []);
                setJustificaciones(parsed.justificaciones ?? []);
                setRegistrosMap(parsed.registrosMap ?? {});
                loadingGroupIdsRef.current.add(ctx.grupo_id);
                setLoading(false);
                void cargarDatosGrupo(ctx, { silent: true });
                return;
              }
            }
          } catch {
            // Si falla el cache, seguimos con la carga normal.
          }
        }

        const [grupoEstudiantesResult, sesionesResult] = await Promise.all([
          getEstudiantesEnGrupo(ctx.grupo_id),
          listSesionesByGrupo(ctx.grupo_id),
        ]);

        if (!grupoEstudiantesResult.ok) {
          if (!isSilent) {
            Alert.alert('No se pudieron cargar estudiantes del grupo', grupoEstudiantesResult.error);
          }
          if (shouldShowLoading) {
            setLoading(false);
          }
          return;
        }
        if (!sesionesResult.ok) {
          if (!isSilent) {
            Alert.alert('No se pudieron cargar sesiones', sesionesResult.error);
          }
          if (shouldShowLoading) {
            setLoading(false);
          }
          return;
        }

        const ids = grupoEstudiantesResult.data.map((g) => g.estudiante_id);
        const estudiantesStartedAt = Date.now();
        const estudiantesResult = await listEstudiantesByIds(ids);
        if (!estudiantesResult.ok) {
          if (!isSilent) {
            Alert.alert('No se pudieron cargar estudiantes', estudiantesResult.error);
          }
          if (shouldShowLoading) {
            setLoading(false);
          }
          return;
        }

        const [justificacionesResult] = await Promise.all([
          listJustificacionesByEstudiantes(ids),
        ]);

        if (!justificacionesResult.ok && !isSilent) {
          Alert.alert('No se pudieron cargar justificaciones', justificacionesResult.error);
        }

        const estudiantesOrdenados = [...estudiantesResult.data].sort((a, b) =>
          (a.nombre_completo || '').localeCompare(b.nombre_completo || '', 'es')
        );

        if (contextoRef.current?.grupo_id !== ctx.grupo_id) {
          return;
        }

        setEstudiantes(estudiantesOrdenados);
        setSesiones(sesionesResult.data);
        setJustificaciones(justificacionesResult.ok ? justificacionesResult.data : []);
        const registrosMapActual = await cargarRegistrosPorSesiones(ctx.grupo_id, sesionesResult.data, ids);

        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            savedAt: Date.now(),
            estudiantes: estudiantesOrdenados,
            sesiones: sesionesResult.data,
            justificaciones: justificacionesResult.ok ? justificacionesResult.data : [],
            registrosMap: registrosMapActual,
          })
        );

        loadingGroupIdsRef.current.add(ctx.grupo_id);

        if (shouldShowLoading) {
          setLoading(false);
        }

      } finally {
        fetchingRef.current = false;

        const pending = pendingGroupLoadRef.current;
        pendingGroupLoadRef.current = null;
        if (pending) {
          void cargarDatosGrupo(pending.ctx, pending.options);
        }
      }
    },
    [cargarRegistrosPorSesiones]
  );

  const handleForegroundSync = useCallback(() => {
    const ctx = contextoRef.current;
    if (!ctx) {
      return;
    }
    void cargarDatosGrupo(ctx, { silent: true });
  }, [cargarDatosGrupo]);

  const handleRegistroUpsert = useCallback((row: AsistenciaRegistro) => {
    const registroKey = keyRegistro(row.sesion_id, row.estudiante_id);

    if (!sesionesIdsRef.current.has(row.sesion_id)) {
      return;
    }

    setRegistrosMap((curr) => ({
      ...curr,
      [registroKey]: row,
    }));

    setPendingRegistroKeys((prev) => {
      if (!prev.has(registroKey)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(registroKey);
      return next;
    });

    delete pendingRegistroPrevRef.current[registroKey];
  }, []);

  const handleRegistroDelete = useCallback(() => {
    handleForegroundSync();
  }, [handleForegroundSync]);

  const handleSesionInsert = useCallback((row: AsistenciaSesion) => {
    const ctx = contextoRef.current;
    if (!ctx || row.grupo_id !== ctx.grupo_id) {
      return;
    }

    setSesiones((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
  }, []);

  const handleSesionUpdate = useCallback((row: AsistenciaSesion) => {
    const ctx = contextoRef.current;
    if (!ctx || row.grupo_id !== ctx.grupo_id) {
      return;
    }

    setSesiones((prev) => prev.map((item) => (item.id === row.id ? row : item)));
  }, []);

  const handleSesionDelete = useCallback((row: { id: string }) => {
    setSesiones((prev) => prev.filter((item) => item.id !== row.id));
    setPendingDeleteSesionIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  }, []);

  const handleCreateSesionManual = useCallback(
    async (input: { fecha: string; tema?: string }) => {
      if (!contextoRef.current) {
        return;
      }

      await runConfigSession(async () => {
        const result = await createSesion({
          grupo_id: contextoRef.current!.grupo_id,
          fecha: input.fecha,
          tema: input.tema,
        });

        if (!result.ok) {
          Alert.alert('No se pudo crear la sesion', result.error);
        }
      });
    },
    [runConfigSession]
  );

  const handleDeleteSesion = useCallback(
    async (sesionId: string) => {
      setPendingDeleteSesionIds((prev) => new Set(prev).add(sesionId));

      await runConfigSession(async () => {
        const result = await deleteSesion(sesionId);
        if (!result.ok) {
          setPendingDeleteSesionIds((prev) => {
            const next = new Set(prev);
            next.delete(sesionId);
            return next;
          });

          Alert.alert('No se pudo eliminar la sesion', result.error);
          return;
        }

        const ctx = contextoRef.current;
        if (!ctx) {
          setPendingDeleteSesionIds((prev) => {
            const next = new Set(prev);
            next.delete(sesionId);
            return next;
          });
          return;
        }

        await cargarDatosGrupo(ctx, { silent: true });

        if (!sesionesIdsRef.current.has(sesionId)) {
          setPendingDeleteSesionIds((prev) => {
            const next = new Set(prev);
            next.delete(sesionId);
            return next;
          });
        }
      });
    },
    [cargarDatosGrupo, runConfigSession]
  );

  const handleGenerateMonth = useCallback(
    async (input: { year: number; month: number; cantidad: number; weekday: number; temaBase?: string }) => {
      if (!contextoRef.current) {
        return;
      }

      const toISO = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const dates: string[] = [];
      const cursor = new Date(input.year, input.month - 1, 1);

      while (cursor.getMonth() === input.month - 1 && dates.length < input.cantidad) {
        if (cursor.getDay() === input.weekday) {
          dates.push(toISO(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const maxPosibles = countWeekdaysInMonth(input.year, input.month, input.weekday);
      if (input.cantidad > maxPosibles) {
        Alert.alert(
          'Cantidad no disponible',
          `Solo hay ${maxPosibles} dias disponibles para esa combinacion en el mes seleccionado.`
        );
        return;
      }

      if (dates.length === 0) {
        Alert.alert('No se encontraron fechas', 'No se encontraron encuentros para esos parametros.');
        return;
      }

      await runConfigSession(async () => {
        for (let i = 0; i < dates.length; i += 1) {
          const result = await createSesion({
            grupo_id: contextoRef.current!.grupo_id,
            fecha: dates[i],
            tema: input.temaBase ? `${input.temaBase} ${i + 1}` : undefined,
          });

          if (!result.ok) {
            const isDuplicate = result.error
              .toLowerCase()
              .includes('ya existe una sesion para este grupo en esa fecha');
            if (!isDuplicate) {
              Alert.alert('Error generando sesiones', result.error);
              return;
            }
          }
        }
      });
    },
    [runConfigSession]
  );

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      await cargarDatosGrupo(contexto!, { silent: false });
    };

    void boot();
    return () => {
      mounted = false;
    };
  }, [contexto, cargarDatosGrupo]);

  useRealtimeTable<AsistenciaSesion>({
    enabled: !!contexto,
    table: 'asistencia_sesiones',
    channelName: `realtime:asistencia_sesiones:${contexto?.grupo_id ?? 'none'}`,
    onInsert: handleSesionInsert,
    onUpdate: handleSesionUpdate,
    onDelete: handleSesionDelete,
  });

  useRealtimeTable<AsistenciaJustificacion>({
    enabled: estudiantes.length > 0,
    table: 'asistencia_justificaciones',
    channelName: `realtime:asistencia_justificaciones:${contexto?.grupo_id ?? 'none'}`,
    onInsert: (row) => {
      if (!estudiantesIdsRef.current.has((row as AsistenciaJustificacion).estudiante_id)) {
        return;
      }
      setJustificaciones((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
    },
    onUpdate: (row) => {
      if (!estudiantesIdsRef.current.has((row as AsistenciaJustificacion).estudiante_id)) {
        return;
      }
      setJustificaciones((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    },
    onDelete: (row) => {
      setJustificaciones((prev) => prev.filter((item) => item.id !== row.id));
    },
  });

  useRealtimeTable<AsistenciaRegistro>({
    enabled: !!contexto,
    table: 'asistencia_registros',
    channelName: `realtime:asistencia_registros:${contexto?.grupo_id ?? 'none'}`,
    onInsert: handleRegistroUpsert,
    onUpdate: handleRegistroUpsert,
    onDelete: handleRegistroDelete,
  });

  const meses = useMemo(() => {
    const map = new Map<string, AsistenciaSesion[]>();
    sesiones.forEach((s) => {
      const m = monthName(s.fecha);
      const key = m.charAt(0).toUpperCase() + m.slice(1);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([mes, sesionesMes]) => ({ mes, sesiones: sesionesMes }));
  }, [sesiones]);

  const resumenPorEstudiante = useMemo(() => {
    const totalSesiones = sesiones.length;

    const out: Record<string, { asistencias: number; porcentaje: number }> = {};
    estudiantes.forEach((e) => {
      const totalPresentes = sesiones.reduce((acc, s) => {
        const r = registrosMap[keyRegistro(s.id, e.id)];
        if (!r) return acc;
        return r.estado === 'presente' || r.estado === 'justificado' || r.estado === 'tardanza'
          ? acc + 1
          : acc;
      }, 0);

      const porcentajeDinamico =
        totalSesiones > 0 ? (totalPresentes / totalSesiones) * 100 : 0;

      out[e.id] = {
        asistencias: totalPresentes,
        porcentaje: Number.isFinite(porcentajeDinamico) ? porcentajeDinamico : 0,
      };
    });
    return out;
  }, [estudiantes, sesiones, registrosMap]);

  const nuncaPresentados = useMemo(() => {
    if (sesiones.length === 0) {
      return [];
    }

    return estudiantes.filter((e) => (resumenPorEstudiante[e.id]?.porcentaje ?? 0) === 0);
  }, [estudiantes, resumenPorEstudiante, sesiones.length]);

  const onToggleEstado = useCallback(
    async (sesionId: string, estudianteId: string, next: AsistenciaRegistro['estado']) => {
      const k = keyRegistro(sesionId, estudianteId);
      if (pendingRegistroKeys.has(k)) {
        return;
      }

      const startedAt = Date.now();
      const prev = registrosMap[k];
      pendingRegistroPrevRef.current[k] = prev;

      setRegistrosMap((curr) => ({
        ...curr,
        [k]: {
          id: prev?.id ?? `tmp-${k}`,
          sesion_id: sesionId,
          estudiante_id: estudianteId,
          estado: next,
          justificacion_id: prev?.justificacion_id ?? null,
          observaciones: prev?.observaciones ?? null,
          created_at: prev?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }));

      setPendingRegistroKeys((prev) => {
        if (prev.has(k)) {
          return prev;
        }

        const nextPending = new Set(prev);
        nextPending.add(k);
        pendingRegistroStartedAtRef.current[k] = startedAt;

        return nextPending;
      });

      const result = await upsertRegistro(sesionId, estudianteId, { estado: next });
      if (!result.ok) {
        setPendingRegistroKeys((prev) => {
          if (!prev.has(k)) {
            return prev;
          }

          const nextPending = new Set(prev);
          nextPending.delete(k);
          return nextPending;
        });

        setRegistrosMap((curr) => {
          const nextMap = { ...curr };
          const previous = pendingRegistroPrevRef.current[k];
          if (previous) {
            nextMap[k] = previous;
          } else {
            delete nextMap[k];
          }
          return nextMap;
        });

        delete pendingRegistroPrevRef.current[k];
        delete pendingRegistroStartedAtRef.current[k];

        Alert.alert('No se pudo guardar asistencia', result.error);
        return;
      }
    },
    [pendingRegistroKeys, registrosMap]
  );

  const openContextoFromParamsIfOnlyGroup = useCallback(async () => {
    if (contexto || !params?.grupo) {
      return;
    }
    const infoResult = await listContextoGrupoByGrupoId(params.grupo.id);
    if (!infoResult.ok || !infoResult.data) {
      return;
    }
    setContexto({
      grupo_id: params.grupo.id,
      carrera_nombre: infoResult.data.carrera_nombre,
      anio_nombre: infoResult.data.anio_nombre,
      asignatura_nombre: infoResult.data.asignatura_nombre,
      grupo_nombre: infoResult.data.grupo_nombre,
      turno: infoResult.data.turno,
    });
  }, [contexto, params]);

  useEffect(() => {
    void openContextoFromParamsIfOnlyGroup();
  }, [openContextoFromParamsIfOnlyGroup]);


  if (!contexto) {
    return (
      <View className="flex-1 bg-[#C5A07D] items-center justify-center">
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  const renderInfoHeader = () => {
    const ctx = contexto!;
    return (
      <View className="mb-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-3">
        {[
          ['Area de Conocimiento', ctx.carrera_nombre],
          ['Carrera', ctx.carrera_nombre],
          ['Turno', ctx.turno || 'Sin turno'],
          ['Grupo', ctx.grupo_nombre],
          ['Asignatura', ctx.asignatura_nombre],
        ].map(([label, value]) => (
          <View key={label} className="flex-row justify-between border-b border-[#DCCEC2] py-1">
            <CustomText className="text-xs font-black text-[#6B5A4A]">{label}</CustomText>
            <CustomText className="text-xs font-semibold text-black">{value}</CustomText>
          </View>
        ))}
      </View>
    );
  };

  if (isWeb || params?.modo === 'web') {
    const fixedWidth = Math.max(460, Math.min(560, width * 0.42));

    return (
      <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
        <AsistenciaSesionesConfigModal
          visible={configModalVisible}
          submitting={configSaving}
          sesiones={sesiones}
          pendingDeleteSesionIds={pendingDeleteSesionIds}
          onClose={() => {
            if (!configSaving) {
              setConfigModalVisible(false);
            }
          }}
          onCreateManual={handleCreateSesionManual}
          onGenerateMonth={handleGenerateMonth}
          onDeleteSesion={handleDeleteSesion}
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
                <CustomText className="text-xs font-black text-black">{'<- Volver'}</CustomText>
              </TouchableOpacity>
              <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Registro de Asistencia</CustomText>
              <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
                Gestiona sesiones y registro de asistencia del grupo
              </CustomText>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => setConfigModalVisible(true)}
                className="mt-3 self-start rounded-xl border-[3px] border-black bg-[#FFD98E] px-4 py-2"
              >
                <CustomText className="text-xs font-black text-black">Configurar sesiones</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="flex-1 rounded-[28px] border-[4px] border-black bg-[#F7F0E4] p-4">
          {renderInfoHeader()}

          <View className="flex-1 rounded-2xl border-[3px] border-black bg-[#FDF9F1] overflow-hidden">
            <View className="flex-row">
              <View style={{ width: fixedWidth, borderRightWidth: 3, borderColor: '#000' }}>
                <View className="h-11 flex-row items-center border-b-[3px] border-black bg-[#F3E7D5] px-2">
                  <CustomText className="w-10 text-xs font-black text-black">No.</CustomText>
                  <CustomText className="w-24 text-xs font-black text-black">Carnet</CustomText>
                  <CustomText className="flex-1 text-xs font-black text-black">Nombres y Apellidos</CustomText>
                  <CustomText className="w-16 text-center text-xs font-black text-black">Asist.</CustomText>
                  <CustomText className="w-12 text-center text-xs font-black text-black">%</CustomText>
                </View>
                <View className="h-11 border-b border-[#DCCEC2] bg-[#FFF7E8] px-2 justify-center">
                  <CustomText className="text-[10px] font-bold text-[#6B5A4A]">Sesiones por mes configurables</CustomText>
                </View>

                <ScrollView>
                  {loading && estudiantes.length === 0 ? (
                    <View className="py-4 px-2 gap-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <View key={`sk-${i}`} className="flex-row items-center justify-between" style={{ height: ROW_HEIGHT - 16 }}>
                          <InlineSkeleton width="60%" height={16} />
                          <View className="flex-row gap-2">
                            <InlineSkeleton width={24} height={16} />
                            <InlineSkeleton width={20} height={16} />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    estudiantes.map((e, index) => {
                      const resumen = resumenPorEstudiante[e.id] ?? { asistencias: 0, porcentaje: 0 };
                      return (
                        <View
                          key={`left-${e.id}`}
                          style={{ height: ROW_HEIGHT }}
                          className="flex-row items-center border-b border-[#EADFD4] px-2"
                        >
                          <CustomText className="w-10 text-xs font-bold text-black">{index + 1}</CustomText>
                          <CustomText className="w-24 text-xs font-semibold text-black">
                            {e.identificacion || '--'}
                          </CustomText>
                          <CustomText className="flex-1 text-xs font-semibold text-black">
                            {e.nombre_completo}
                          </CustomText>
                          <CustomText className="w-16 text-center text-xs font-black text-black">
                            {resumen.asistencias}
                          </CustomText>
                          <CustomText className="w-12 text-center text-xs font-black text-black">
                            {Math.round(resumen.porcentaje)}
                          </CustomText>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View className="h-11 flex-row border-b-[3px] border-black bg-[#F3E7D5]">
                    {meses.map((m) => (
                      <View
                        key={m.mes}
                        style={{ width: m.sesiones.length * CELL_WIDTH_WEB }}
                        className="items-center justify-center border-r border-black"
                      >
                        <CustomText className="text-xs font-black text-black">{m.mes}</CustomText>
                      </View>
                    ))}
                  </View>

                  <View className="h-11 flex-row border-b border-[#DCCEC2] bg-[#FFF7E8]">
                    {sesiones.map((s) => (
                      <View
                        key={`date-${s.id}`}
                        style={{ width: CELL_WIDTH_WEB }}
                        className="items-center justify-center border-r border-[#DCCEC2]"
                      >
                        <CustomText className="text-[10px] font-bold text-black">{shortDate(s.fecha)}</CustomText>
                      </View>
                    ))}
                  </View>

                  <ScrollView>
                    {estudiantes.map((e) => (
                      <View key={`row-${e.id}`} style={{ height: ROW_HEIGHT }} className="flex-row border-b border-[#EADFD4]">
                        {sesiones.map((s) => {
                          const registro = registrosMap[keyRegistro(s.id, e.id)];
                          const ui = estadoToUi(registro?.estado);
                          const registroKey = keyRegistro(s.id, e.id);
                          const isPending = pendingRegistroKeys.has(registroKey);
                          return (
                            <Pressable
                              key={registroKey}
                              onPress={() => {
                                if (isPending) {
                                  return;
                                }

                                const next = registro?.estado === 'presente' ? 'ausente' : 'presente';
                                void onToggleEstado(s.id, e.id, next);
                              }}
                              disabled={isPending}
                              style={{
                                width: CELL_WIDTH_WEB,
                                backgroundColor: ui.bg,
                                opacity: isPending ? 0.72 : 1,
                              }}
                              className="items-center justify-center border-r border-[#DCCEC2]"
                            >
                              <CustomText className="text-xs font-black text-black">{ui.label}</CustomText>
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>
          </View>

          <View className="mt-3 flex-row gap-3">
            <View className="flex-1 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-3">
              <CustomText className="text-sm font-black text-black">Estudiantes Nunca Presentados</CustomText>
              <View className="mt-2 border-b border-[#DCCEC2] pb-1 flex-row">
                <CustomText className="w-10 text-xs font-black text-black">No.</CustomText>
                <CustomText className="w-24 text-xs font-black text-black">Carnet</CustomText>
                <CustomText className="flex-1 text-xs font-black text-black">Estudiante</CustomText>
              </View>
              <ScrollView style={{ maxHeight: 140 }}>
                {nuncaPresentados.map((e, i) => (
                  <View key={`nunca-${e.id}`} className="flex-row border-b border-[#EADFD4] py-1">
                    <CustomText className="w-10 text-xs font-semibold text-black">{i + 1}</CustomText>
                    <CustomText className="w-24 text-xs font-semibold text-black">{e.identificacion || '--'}</CustomText>
                    <CustomText className="flex-1 text-xs font-semibold text-black">{e.nombre_completo}</CustomText>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View className="flex-1 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-3">
              <CustomText className="text-sm font-black text-black">Justificacion de Faltas</CustomText>
              <View className="mt-2 border-b border-[#DCCEC2] pb-1 flex-row">
                <CustomText className="w-20 text-[10px] font-black text-black">Carnet</CustomText>
                <CustomText className="w-16 text-[10px] font-black text-black">Fecha</CustomText>
                <CustomText className="flex-1 text-[10px] font-black text-black">Estudiante</CustomText>
                <CustomText className="w-28 text-[10px] font-black text-black">Justificacion</CustomText>
                <CustomText className="w-24 text-[10px] font-black text-black">Comprobante</CustomText>
              </View>
              <ScrollView style={{ maxHeight: 140 }}>
                {justificaciones.map((j) => {
                  const est = estudiantes.find((e) => e.id === j.estudiante_id);
                  return (
                    <View key={j.id} className="flex-row border-b border-[#EADFD4] py-1">
                      <CustomText className="w-20 text-[10px] font-semibold text-black">
                        {est?.identificacion || '--'}
                      </CustomText>
                      <CustomText className="w-16 text-[10px] font-semibold text-black">{shortDate(j.fecha)}</CustomText>
                      <CustomText className="flex-1 text-[10px] font-semibold text-black">
                        {est?.nombre_completo || 'N/D'}
                      </CustomText>
                      <CustomText className="w-28 text-[10px] font-semibold text-black">{j.motivo}</CustomText>
                      <CustomText className="w-24 text-[10px] font-semibold text-black">
                        {j.comprobante_url ? 'Adjunto' : 'Sin archivo'}
                      </CustomText>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const leftWidthMobile = 180;

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <AsistenciaSesionesConfigModal
        visible={configModalVisible}
        submitting={configSaving}
        sesiones={sesiones}
        pendingDeleteSesionIds={pendingDeleteSesionIds}
        onClose={() => {
          if (!configSaving) {
            setConfigModalVisible(false);
          }
        }}
        onCreateManual={handleCreateSesionManual}
        onGenerateMonth={handleGenerateMonth}
        onDeleteSesion={handleDeleteSesion}
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
              <CustomText className="text-xs font-black text-black">{'<- Volver'}</CustomText>
            </TouchableOpacity>
            <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Asistencia Movil</CustomText>
            <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
              {'Toque en celda: A -> P -> A'}
            </CustomText>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={() => setConfigModalVisible(true)}
              className="mt-3 self-start rounded-xl border-[3px] border-black bg-[#FFD98E] px-4 py-2"
            >
              <CustomText className="text-xs font-black text-black">Configurar sesiones</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-1 rounded-[28px] border-[4px] border-black bg-[#F7F0E4] p-3">
        {renderInfoHeader()}

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View className="flex-row border-b-[3px] border-black bg-[#F3E7D5]">
              <View style={{ width: leftWidthMobile }} className="h-11 justify-center px-2 border-r border-black">
                <CustomText className="text-xs font-black text-black">Estudiante / %</CustomText>
              </View>
              {sesiones.map((s) => (
                <View
                  key={`mh-${s.id}`}
                  style={{ width: CELL_WIDTH_MOBILE, height: 44 }}
                  className="items-center justify-center border-r border-black"
                >
                  <CustomText className="text-[10px] font-black text-black">{shortDate(s.fecha)}</CustomText>
                </View>
              ))}
            </View>

            <FlatList
              data={estudiantes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 18 }}
              ListEmptyComponent={
                loading ? (
                  <View className="py-4 flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <View key={`skr-${i}`} className="flex-row gap-8 pl-4" style={{ height: ROW_HEIGHT - 16 }}>
                        <InlineSkeleton width={24} height={24} />
                        <InlineSkeleton width={24} height={24} />
                        <InlineSkeleton width={24} height={24} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="py-10 items-center justify-center">
                    <CustomText className="text-sm font-semibold text-[#6B5A4A]">Sin estudiantes</CustomText>
                  </View>
                )
              }
              renderItem={({ item, index }) => {
                const resumen = resumenPorEstudiante[item.id] ?? { asistencias: 0, porcentaje: 0 };
                return (
                  <View className="flex-row border-b border-[#EADFD4]">
                    <View style={{ width: leftWidthMobile, minHeight: 64 }} className="px-2 py-2 border-r border-[#DCCEC2]">
                      <CustomText className="text-xs font-black text-black">{index + 1}. {item.nombre_completo}</CustomText>
                      <CustomText className="mt-1 text-[10px] font-semibold text-[#6B5A4A]">
                        {item.identificacion || '--'} • {resumen.asistencias}/{sesiones.length} ({Math.round(resumen.porcentaje)}%)
                      </CustomText>
                    </View>
                    {sesiones.map((s) => {
                      const registro = registrosMap[keyRegistro(s.id, item.id)];
                      const ui = estadoToUi(registro?.estado);
                      const registroKey = keyRegistro(s.id, item.id);
                      const isPending = pendingRegistroKeys.has(registroKey);
                      return (
                        <Pressable
                          key={registroKey}
                          onPress={() => {
                            if (isPending) {
                              return;
                            }

                            const next = nextEstadoMobile(registro?.estado);
                            void onToggleEstado(s.id, item.id, next);
                          }}
                          disabled={isPending}
                          style={{
                            width: CELL_WIDTH_MOBILE,
                            minHeight: 64,
                            backgroundColor: ui.bg,
                            opacity: isPending ? 0.72 : 1,
                          }}
                          className="items-center justify-center border-r border-[#DCCEC2]"
                        >
                          <CustomText className="text-base font-black text-black">{ui.label}</CustomText>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              }}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
