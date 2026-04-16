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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomText } from '@/components/CustomText';
import type { RootStackParamList } from '@/types/navigation';
import {
  type AsistenciaJustificacion,
  type AsistenciaRegistro,
  type AsistenciaSesion,
  createSesion,
  deleteSesion,
  getEstudiantesEnGrupo,
  getRegistrosBySesion,
  listContextoGrupoByGrupoId,
  listGruposAsistenciaByProfesor,
  listJustificacionesByEstudiantes,
  listSesionesByGrupo,
  upsertRegistro,
  type GrupoAsistenciaOption,
} from '@/lib/services/asistenciaService';
import { listEstudiantesByIds, type Estudiante } from '@/lib/services/estudiantesService';
import { useRealtimeCollection, useRealtimeTable } from '@/lib/realtime';
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
  if (estado === 'ausente' || !estado) return 'presente';
  if (estado === 'presente') return 'justificado';
  if (estado === 'justificado') return 'tardanza';
  return 'ausente';
}

export default function AsistenciaScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const params = route.params;
  const { width } = useWindowDimensions();
  const isWeb = process.env.EXPO_OS === 'web';

  const [loading, setLoading] = useState(true);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [gruposDisponibles, setGruposDisponibles] = useState<GrupoAsistenciaOption[]>([]);
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
  const contextoRef = useRef<ContextoVista | null>(contexto);
  const sesionesIdsRef = useRef<Set<string>>(new Set());
  const loadingGroupIdsRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);
  const { run: runConfigSession, isRunning: configSaving } = useSingleFlight();

  useEffect(() => {
    contextoRef.current = contexto;
  }, [contexto]);

  useEffect(() => {
    sesionesIdsRef.current = new Set(sesiones.map((s) => s.id));
  }, [sesiones]);

  const cargarSelector = useCallback(async () => {
    setSelectorLoading(true);
    const result = await listGruposAsistenciaByProfesor();
    if (!result.ok) {
      Alert.alert('No se pudieron cargar los grupos', result.error);
      setGruposDisponibles([]);
      setSelectorLoading(false);
      return;
    }
    setGruposDisponibles(result.data);
    setSelectorLoading(false);
  }, []);

  const cargarRegistrosPorSesiones = useCallback(
    async (sesionesData: AsistenciaSesion[], estudiantesIds: string[]) => {
      if (sesionesData.length === 0 || estudiantesIds.length === 0) {
        setRegistrosMap({});
        return;
      }

      const pares = await Promise.all(
        sesionesData.map(async (sesion) => {
          const result = await getRegistrosBySesion(sesion.id);
          if (!result.ok) {
            return [] as AsistenciaRegistro[];
          }
          return result.data;
        })
      );

      const byKey: RegistroByKey = {};
      pares.flat().forEach((r) => {
        byKey[keyRegistro(r.sesion_id, r.estudiante_id)] = r;
      });
      setRegistrosMap(byKey);
    },
    []
  );

  const cargarDatosGrupo = useCallback(
    async (ctx: ContextoVista, options?: { silent?: boolean }) => {
      const isSilent = !!options?.silent;
      if (fetchingRef.current) {
        return;
      }

      fetchingRef.current = true;
      const shouldShowLoading = !isSilent && !loadingGroupIdsRef.current.has(ctx.grupo_id);
      if (shouldShowLoading) {
        setLoading(true);
      }

      try {

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

        setEstudiantes(estudiantesOrdenados);
        setSesiones(sesionesResult.data);
        setJustificaciones(justificacionesResult.ok ? justificacionesResult.data : []);
        await cargarRegistrosPorSesiones(sesionesResult.data, ids);

        loadingGroupIdsRef.current.add(ctx.grupo_id);

        if (shouldShowLoading) {
          setLoading(false);
        }
      } finally {
        fetchingRef.current = false;
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
    if (!sesionesIdsRef.current.has(row.sesion_id)) {
      return;
    }

    setRegistrosMap((curr) => ({
      ...curr,
      [keyRegistro(row.sesion_id, row.estudiante_id)]: row,
    }));
  }, []);

  const handleRegistroDelete = useCallback(() => {
    handleForegroundSync();
  }, [handleForegroundSync]);

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
      await runConfigSession(async () => {
        const result = await deleteSesion(sesionId);
        if (!result.ok) {
          Alert.alert('No se pudo eliminar la sesion', result.error);
        }
      });
    },
    [runConfigSession]
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
      if (!contexto) {
        await cargarSelector();
        if (!mounted) return;
        setLoading(false);
        return;
      }
      await cargarDatosGrupo(contexto, { silent: false });
    };

    void boot();
    return () => {
      mounted = false;
    };
  }, [contexto, cargarDatosGrupo, cargarSelector]);

  useRealtimeCollection<AsistenciaSesion>({
    enabled: !!contexto,
    table: 'asistencia_sesiones',
    filter: contexto ? `grupo_id=eq.${contexto.grupo_id}` : undefined,
    channelName: `realtime:asistencia_sesiones:${contexto?.grupo_id ?? 'none'}`,
    setItems: setSesiones,
    onForegroundSync: handleForegroundSync,
  });

  useRealtimeCollection<AsistenciaJustificacion>({
    enabled: estudiantes.length > 0,
    table: 'asistencia_justificaciones',
    channelName: `realtime:asistencia_justificaciones:${contexto?.grupo_id ?? 'none'}`,
    setItems: setJustificaciones,
    onForegroundSync: handleForegroundSync,
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
    const out: Record<string, { asistencias: number; porcentaje: number }> = {};
    estudiantes.forEach((e) => {
      const totalPresentes = sesiones.reduce((acc, s) => {
        const r = registrosMap[keyRegistro(s.id, e.id)];
        if (!r) return acc;
        return r.estado === 'presente' || r.estado === 'justificado' || r.estado === 'tardanza'
          ? acc + 1
          : acc;
      }, 0);
      const porcentajeBase16 = (totalPresentes / 16) * 100;
      out[e.id] = {
        asistencias: totalPresentes,
        porcentaje: Number.isFinite(porcentajeBase16) ? porcentajeBase16 : 0,
      };
    });
    return out;
  }, [estudiantes, sesiones, registrosMap]);

  const nuncaPresentados = useMemo(() => {
    return estudiantes.filter((e) => (resumenPorEstudiante[e.id]?.asistencias ?? 0) === 0);
  }, [estudiantes, resumenPorEstudiante]);

  const onToggleEstado = useCallback(
    async (sesionId: string, estudianteId: string, next: AsistenciaRegistro['estado']) => {
      const k = keyRegistro(sesionId, estudianteId);
      const prev = registrosMap[k];

      const optimistic: AsistenciaRegistro = {
        id: prev?.id ?? `tmp-${k}`,
        sesion_id: sesionId,
        estudiante_id: estudianteId,
        estado: next,
        justificacion_id: prev?.justificacion_id ?? null,
        observaciones: prev?.observaciones ?? null,
        created_at: prev?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setRegistrosMap((curr) => ({ ...curr, [k]: optimistic }));

      const result = await upsertRegistro(sesionId, estudianteId, { estado: next });
      if (!result.ok) {
        setRegistrosMap((curr) => {
          const nextMap = { ...curr };
          if (prev) {
            nextMap[k] = prev;
          } else {
            delete nextMap[k];
          }
          return nextMap;
        });
        Alert.alert('No se pudo guardar asistencia', result.error);
        return;
      }

      setRegistrosMap((curr) => ({ ...curr, [k]: result.data }));
    },
    [registrosMap]
  );

  const selectGrupoDesdeLista = useCallback(
    async (grupo: GrupoAsistenciaOption) => {
      const context: ContextoVista = {
        grupo_id: grupo.id,
        carrera_nombre: grupo.carrera_nombre,
        anio_nombre: grupo.anio_nombre,
        asignatura_nombre: grupo.asignatura_nombre,
        grupo_nombre: grupo.nombre,
        turno: grupo.turno,
      };
      setContexto(context);
    },
    []
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
      <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
        <AsistenciaSesionesConfigModal
          visible={configModalVisible}
          submitting={configSaving}
          sesiones={sesiones}
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
              <CustomText className="mt-3 text-2xl font-black text-[#1E140D]">Asistencia</CustomText>
              <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
                Selecciona un grupo para continuar
              </CustomText>
            </View>
          </View>
        </View>

        <View className="flex-1 rounded-[28px] border-[4px] border-black bg-[#F7F0E4] p-4">
          {selectorLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#000" />
            </View>
          ) : (
            <FlatList
              data={gruposDisponibles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    void selectGrupoDesdeLista(item);
                  }}
                  className="mb-3 rounded-2xl border-[3px] border-black bg-[#FDF9F1] p-4"
                >
                  <CustomText className="text-base font-black text-black">{item.nombre}</CustomText>
                  <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
                    {item.carrera_nombre} • {item.anio_nombre}
                  </CustomText>
                  <CustomText className="mt-1 text-sm font-semibold text-[#5E5045]">
                    {item.asignatura_nombre} • Turno: {item.turno || 'Sin turno'}
                  </CustomText>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="mt-10 items-center">
                  <CustomText className="text-center text-base font-bold text-[#5E5045]">
                    No tienes grupos disponibles para asistencia.
                  </CustomText>
                </View>
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#C5A07D] items-center justify-center">
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  const renderInfoHeader = () => (
    <View className="mb-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] p-3">
      {[
        ['Area de Conocimiento', contexto.carrera_nombre],
        ['Carrera', contexto.carrera_nombre],
        ['Turno', contexto.turno || 'Sin turno'],
        ['Grupo', contexto.grupo_nombre],
        ['Asignatura', contexto.asignatura_nombre],
      ].map(([label, value]) => (
        <View key={label} className="flex-row justify-between border-b border-[#DCCEC2] py-1">
          <CustomText className="text-xs font-black text-[#6B5A4A]">{label}</CustomText>
          <CustomText className="text-xs font-semibold text-black">{value}</CustomText>
        </View>
      ))}
    </View>
  );

  if (isWeb || params?.modo === 'web') {
    const fixedWidth = Math.max(460, Math.min(560, width * 0.42));

    return (
      <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
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
                Version web con tabla completa y columnas fijas
              </CustomText>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => {
                  console.log('[ASISTENCIA] Botón Configurar sesiones presionado. Estado actual:', configModalVisible);
                  setConfigModalVisible(true);
                  console.log('[ASISTENCIA] Estado después de setConfigModalVisible(true):', true);
                }}
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
                  {estudiantes.map((e, index) => {
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
                  })}
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
                          return (
                            <Pressable
                              key={`${e.id}-${s.id}`}
                              onPress={() => {
                                const next = registro?.estado === 'presente' ? 'ausente' : 'presente';
                                void onToggleEstado(s.id, e.id, next);
                              }}
                              style={{ width: CELL_WIDTH_WEB, backgroundColor: ui.bg }}
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
              {'Toque en celda: A -> P -> J -> T -> A'}
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
              renderItem={({ item, index }) => {
                const resumen = resumenPorEstudiante[item.id] ?? { asistencias: 0, porcentaje: 0 };
                return (
                  <View className="flex-row border-b border-[#EADFD4]">
                    <View style={{ width: leftWidthMobile, minHeight: 64 }} className="px-2 py-2 border-r border-[#DCCEC2]">
                      <CustomText className="text-xs font-black text-black">{index + 1}. {item.nombre_completo}</CustomText>
                      <CustomText className="mt-1 text-[10px] font-semibold text-[#6B5A4A]">
                        {item.identificacion || '--'} • {resumen.asistencias}/16 ({Math.round(resumen.porcentaje)}%)
                      </CustomText>
                    </View>
                    {sesiones.map((s) => {
                      const registro = registrosMap[keyRegistro(s.id, item.id)];
                      const ui = estadoToUi(registro?.estado);
                      return (
                        <Pressable
                          key={`${item.id}-${s.id}`}
                          onPress={() => {
                            const next = nextEstadoMobile(registro?.estado);
                            void onToggleEstado(s.id, item.id, next);
                          }}
                          style={{
                            width: CELL_WIDTH_MOBILE,
                            minHeight: 64,
                            backgroundColor: ui.bg,
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
