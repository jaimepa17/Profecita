import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { listGrupos, type Grupo } from '@/lib/services/gruposService';
import {
  getReporteNotasPorGrupo,
  calcularPromedioPonderado,
  type ReporteGrupo,
} from '@/lib/services/reportesService';
import AlertModal, { type AlertModalPayload, type AlertModalType } from '@/components/AlertModal';
import { BREAKPOINTS } from '@/lib/constants/breakpoints';
import { ClipboardSticker } from '@/components/ClipboardSticker';
import { MemoSticker } from '@/components/MemoSticker';
import { InlineSkeleton } from '@/components/InlineSkeleton';
import { GroupSticker } from '@/components/GroupSticker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reportes'>;
type VistaMode = 'tabla' | 'agrupada';

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

interface ActivityCardProps {
  actividad: ReporteGrupo['actividades'][0];
  estudiantes: ReporteGrupo['estudiantes'];
  promedioActividad: number;
  isAndroid: boolean;
  carruselIndex: number;
  onCarruselIndexChange: (index: number) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  actividad,
  estudiantes,
  promedioActividad,
  isAndroid,
  carruselIndex,
  onCarruselIndexChange,
}) => {
  const estudiantesPorPagina = 3;
  const totalPaginas = Math.ceil(estudiantes.length / estudiantesPorPagina);
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth - 56; // Margen para padding del contenedor

  // Para Android: carrusel horizontal
  if (isAndroid && estudiantes.length > 0) {
    return (
      <View className="mt-2 rounded-xl border-[3px] border-black bg-[#FDF9F1] px-3 py-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xs font-black text-black">{actividad.nombre}</Text>
            <Text className="text-[10px] font-semibold text-[#7A6857]">
              {actividad.bloque} • {actividad.tipo} • {actividad.peso_porcentaje} pts
            </Text>
          </View>
          <View className="rounded-full border-[3px] border-black bg-[#D7ECFF] px-2 py-1">
            <Text className="text-xs font-black text-black">
              {promedioActividad}
            </Text>
          </View>
        </View>

        <View className="mt-2">
          <FlatList
            data={Array.from({ length: totalPaginas }).map((_, pagina) => {
              const inicio = pagina * estudiantesPorPagina;
              const fin = inicio + estudiantesPorPagina;
              return estudiantes.slice(inicio, fin);
            })}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            onMomentumScrollEnd={(e) => {
              const pagina = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
              onCarruselIndexChange(pagina);
            }}
            scrollEventThrottle={16}
            bounces={false}
            alwaysBounceHorizontal={false}
            nestedScrollEnabled={true}
            style={{ width: pageWidth }}
            renderItem={({ item: estudiantesPagina }) => (
              <View style={{ width: pageWidth }}>
                {estudiantesPagina.map((estudiante) => {
                  const nota = estudiante.notas[actividad.id];
                  return (
                    <View
                      key={estudiante.id}
                      className="flex-row items-center justify-between py-1 border-b border-[#DCCEC2]/40"
                      style={{ paddingHorizontal: 8 }}
                    >
                      <Text 
                        className="text-[11px] font-semibold text-[#5E5045]" 
                        style={{ flex: 1, flexShrink: 0 }}
                        numberOfLines={1}
                      >
                        {estudiante.nombre_completo}
                      </Text>
                      <Text 
                        className="text-sm font-black text-black"
                        style={{ minWidth: 50, textAlign: 'right', overflow: 'visible' }}
                      >
                        {nota !== undefined ? nota : '-'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          />
          {/* Dots indicadores */}
          {totalPaginas > 1 && (
            <View className="flex-row justify-center mt-1 gap-1">
              {Array.from({ length: totalPaginas }).map((_, i) => (
                <View
                  key={i}
                  className={`h-2 w-2 rounded-full ${i === carruselIndex ? 'bg-black' : 'bg-gray-300'}`}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Para web o Android sin carrusel: lista vertical simple
  return (
    <View className="mt-2 rounded-xl border-[3px] border-black bg-[#FDF9F1] px-3 py-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-black text-black">{actividad.nombre}</Text>
          <Text className="text-[10px] font-semibold text-[#7A6857]">
            {actividad.bloque} • {actividad.tipo} • {actividad.peso_porcentaje} pts
          </Text>
        </View>
        <View className="rounded-full border-[3px] border-black bg-[#D7ECFF] px-2 py-1">
          <Text className="text-xs font-black text-black">
            {promedioActividad}
          </Text>
        </View>
      </View>

      <View className="mt-2">
        {estudiantes.slice(0, 3).map((estudiante) => {
          const nota = estudiante.notas[actividad.id];
          return (
            <View
              key={estudiante.id}
              className="flex-row items-center justify-between py-1 border-b border-[#DCCEC2]/40"
            >
              <Text className="text-[11px] font-semibold text-[#5E5045] flex-1" numberOfLines={1}>
                {estudiante.nombre_completo}
              </Text>
              <Text className="text-[11px] font-black text-black">
                {nota !== undefined ? nota : '-'}
              </Text>
            </View>
          );
        })}
        {estudiantes.length > 3 && (
          <Text className="text-[10px] font-semibold text-[#7A6857] mt-1">
            +{estudiantes.length - 3} estudiantes más
          </Text>
        )}
      </View>
    </View>
  );
};

export default function Reportes() {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const { width: windowWidth } = useWindowDimensions();
  
  const isMobileWeb = isWeb && windowWidth < BREAKPOINTS.tablet;
  const isDesktop = isWeb && windowWidth >= BREAKPOINTS.tablet;
  
  const studentColumnWidth = isWeb ? 200 : 150;
  const activityColumnWidth = isWeb ? 150 : 100;
  const averageColumnWidth = isWeb ? 120 : 100;
  const idColumnWidth = isWeb ? 120 : 0;

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [vistaMode, setVistaMode] = useState<VistaMode>('tabla');
  const [reporte, setReporte] = useState<ReporteGrupo | null>(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [estudianteDetalle, setEstudianteDetalle] = useState<
    ReporteGrupo['estudiantes'][0] | null
  >(null);
  const [paginaEstudiantes, setPaginaEstudiantes] = useState(1);
  const [carruselIndices, setCarruselIndices] = useState<Record<string, number>>({});
  const estudiantesPorPagina = 10;
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

  const cargarGrupos = useCallback(async () => {
    setLoadingBase(true);
    const result = await listGrupos();

    if (!result.ok) {
      showFeedback('error', 'No se pudieron cargar los grupos', result.error);
      setGrupos([]);
      setLoadingBase(false);
      return;
    }

    setGrupos(result.data);
    if (result.data.length > 0 && !selectedGrupoId) {
      setSelectedGrupoId(result.data[0].id);
    }
    setLoadingBase(false);
  }, [showFeedback, selectedGrupoId]);

  const cargarReporte = useCallback(async (grupoId: string) => {
    setLoadingReporte(true);
    const result = await getReporteNotasPorGrupo(grupoId);

    if (!result.ok) {
      showFeedback('error', 'No se pudo cargar el reporte', result.error);
      setReporte(null);
      setLoadingReporte(false);
      return;
    }

    setReporte(result.data);
    setLoadingReporte(false);
  }, [showFeedback]);

  useEffect(() => {
    void cargarGrupos();
  }, [cargarGrupos]);

  useEffect(() => {
    if (!selectedGrupoId) {
      setReporte(null);
      return;
    }

    void cargarReporte(selectedGrupoId);
  }, [selectedGrupoId, cargarReporte]);

  useEffect(() => {
    // Forzar vista agrupada en Android y web responsive
    if (isAndroid || isMobileWeb) {
      setVistaMode('agrupada');
    }
  }, [isAndroid, isMobileWeb]);

  useEffect(() => {
    // Resetear paginación cuando cambia el reporte
    setPaginaEstudiantes(1);
    setCarruselIndices({});
  }, [reporte]);

  const gruposFiltrados = useMemo(() => {
    const query = filtroGrupo.trim().toLowerCase();
    if (!query) {
      return grupos;
    }

    return grupos.filter((item) => item.nombre.toLowerCase().includes(query));
  }, [grupos, filtroGrupo]);

  const grupoItems: ItemChip[] = gruposFiltrados.map((item) => ({
    id: item.id,
    nombre: item.nombre,
  }));

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
        >
          <View className="flex-row gap-2">
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
        </ScrollView>
      )}
    </View>
  );

  const renderEstadisticas = () => {
    if (!reporte) return null;

    const { estadisticas } = reporte;
    const minWidthClass = isWeb ? 'min-w-[150px]' : 'min-w-[100px]';
    const fontSizeClass = isWeb ? 'text-sm' : 'text-xs';
    const valueFontSizeClass = isWeb ? 'text-xl' : 'text-lg';

    return (
      <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
        <Text className={`${fontSizeClass} font-black uppercase tracking-wide text-[#7A6857]`}>
          Estadísticas del grupo
        </Text>

        <View className="mt-2 flex-row flex-wrap gap-3">
          <View className={`flex-1 ${minWidthClass} rounded-xl border-[3px] border-black bg-[#D7ECFF] px-3 py-2`}>
            <Text className={`${fontSizeClass} font-semibold text-[#44596A]`}>Promedio</Text>
            <Text className={`${valueFontSizeClass} font-black text-black`}>{estadisticas.promedioGeneral}</Text>
          </View>

          <View className={`flex-1 ${minWidthClass} rounded-xl border-[3px] border-black bg-[#BDE9C7] px-3 py-2`}>
            <Text className={`${fontSizeClass} font-semibold text-[#4C5B42]`}>Nota más alta</Text>
            <Text className={`${valueFontSizeClass} font-black text-black`}>{estadisticas.notaMasAlta}</Text>
          </View>

          <View className={`flex-1 ${minWidthClass} rounded-xl border-[3px] border-black bg-[#FFC9C2] px-3 py-2`}>
            <Text className={`${fontSizeClass} font-semibold text-[#6B4A4A]`}>Nota más baja</Text>
            <Text className={`${valueFontSizeClass} font-black text-black`}>{estadisticas.notaMasBaja}</Text>
          </View>
        </View>

        <View className="mt-2 flex-row gap-3">
          <View className={`flex-1 rounded-xl border-[3px] border-black bg-[#F3E7D5] px-3 py-2`}>
            <Text className={`${fontSizeClass} font-semibold text-[#5E5045]`}>Estudiantes</Text>
            <Text className={`${valueFontSizeClass} font-black text-black`}>{estadisticas.totalEstudiantes}</Text>
          </View>

          <View className={`flex-1 rounded-xl border-[3px] border-black bg-[#F3E7D5] px-3 py-2`}>
            <Text className={`${fontSizeClass} font-semibold text-[#5E5045]`}>Actividades</Text>
            <Text className={`${valueFontSizeClass} font-black text-black`}>{estadisticas.totalActividades}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderVistaTabla = () => {
    if (!reporte || reporte.actividades.length === 0) return null;

    const fontSizeClass = isWeb ? 'text-sm' : 'text-xs';
    const smallFontSizeClass = isWeb ? 'text-xs' : 'text-[10px]';
    
    // Estilos dinámicos para columnas de actividades
    const activityStyle = isWeb 
      ? { flex: 1, minWidth: 80, maxWidth: 150 }
      : { width: activityColumnWidth };

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="mt-3" style={isWeb ? { width: '100%' } : {}}>
          <View className="flex-row border-b-[3px] border-black bg-[#FFF7E8]">
            {isWeb && (
              <View style={{ width: idColumnWidth }} className="px-3 py-2 border-r-[3px] border-black">
                <Text className={`${fontSizeClass} font-black text-black`}>ID</Text>
              </View>
            )}
            <View style={{ width: studentColumnWidth }} className="px-3 py-2 border-r-[3px] border-black">
              <Text className={`${fontSizeClass} font-black text-black`}>Estudiante</Text>
            </View>
            {reporte.actividades.map((actividad) => (
              <View key={actividad.id} style={activityStyle} className="px-3 py-2 border-r-[3px] border-black">
                <Text className={`${fontSizeClass} font-black text-black`} numberOfLines={2}>
                  {actividad.nombre}
                </Text>
                <Text className={`${smallFontSizeClass} font-semibold text-[#7A6857]`}>
                  {isWeb ? `${actividad.tipo} • ${actividad.peso_porcentaje} pts` : `${actividad.peso_porcentaje} pts`}
                </Text>
              </View>
            ))}
            <View style={{ width: averageColumnWidth }} className="px-3 py-2">
              <Text className={`${fontSizeClass} font-black text-black`}>Promedio</Text>
            </View>
          </View>

          {reporte.estudiantes.map((estudiante) => {
            const promedio = calcularPromedioPonderado(
              estudiante.notas,
              reporte.actividades
            );

            return (
              <TouchableOpacity
                key={estudiante.id}
                activeOpacity={0.9}
                onPress={() => setEstudianteDetalle(estudiante)}
                className="flex-row border-b-[3px] border-black bg-[#FDF9F1]"
              >
                {isWeb && (
                  <View style={{ width: idColumnWidth }} className="px-3 py-2 border-r-[3px] border-black">
                    <Text className={`${fontSizeClass} font-semibold text-[#5E5045]`} numberOfLines={1}>
                      {estudiante.identificacion || '-'}
                    </Text>
                  </View>
                )}
                <View style={{ width: studentColumnWidth }} className="px-3 py-2 border-r-[3px] border-black">
                  <Text className={`${fontSizeClass} font-semibold text-black`} numberOfLines={isWeb ? undefined : 2}>
                    {estudiante.nombre_completo}
                  </Text>
                </View>
                {reporte.actividades.map((actividad) => {
                  const nota = estudiante.notas[actividad.id];
                  return (
                    <View
                      key={actividad.id}
                      style={activityStyle}
                      className="px-3 py-2 border-r-[3px] border-black items-center"
                    >
                      <Text className={`${fontSizeClass} font-black text-black`}>
                        {nota !== undefined ? nota : '-'}
                      </Text>
                    </View>
                  );
                })}
                <View style={{ width: averageColumnWidth }} className="px-3 py-2 items-center">
                  <Text className={`${fontSizeClass} font-black text-[#1E140D]`}>{promedio}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderVistaAgrupada = () => {
    if (!reporte || reporte.actividades.length === 0) return null;

    const parcialesMap = new Map<string, typeof reporte.actividades>();
    reporte.actividades.forEach((actividad) => {
      if (!parcialesMap.has(actividad.parcial)) {
        parcialesMap.set(actividad.parcial, []);
      }
      parcialesMap.get(actividad.parcial)!.push(actividad);
    });

    // Para desktop: paginación de 10 estudiantes
    const mostrarPaginacionDesktop = isDesktop && reporte.estudiantes.length > estudiantesPorPagina;
    const inicioDesktop = (paginaEstudiantes - 1) * estudiantesPorPagina;
    const finDesktop = inicioDesktop + estudiantesPorPagina;
    const estudiantesPaginaDesktop = reporte.estudiantes.slice(inicioDesktop, finDesktop);

    // Determinar qué lista de estudiantes mostrar según plataforma
    const estudiantesAMostrar = isDesktop ? estudiantesPaginaDesktop : 
                                reporte.estudiantes.slice(0, 3); // web responsive muestra 3

    return (
      <View className="mt-3 gap-3">
        {Array.from(parcialesMap.entries()).map(([parcial, actividades]) => (
          <View
            key={parcial}
            className="rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3"
          >
            <Text className="text-sm font-black text-[#1E140D]">{parcial}</Text>

            {actividades.map((actividad) => {
              const promedioActividad = reporte.estadisticas.promedioPorActividad[actividad.id] ?? 0;
              
              if (isAndroid) {
                return (
                  <ActivityCard
                    key={actividad.id}
                    actividad={actividad}
                    estudiantes={reporte.estudiantes}
                    promedioActividad={promedioActividad}
                    isAndroid={isAndroid}
                    carruselIndex={carruselIndices[actividad.id] || 0}
                    onCarruselIndexChange={(index) => 
                      setCarruselIndices(prev => ({ ...prev, [actividad.id]: index }))
                    }
                  />
                );
              }
              
              // Para web: vista agrupada sin carrusel
              return (
                <View key={actividad.id} className="mt-2 rounded-xl border-[3px] border-black bg-[#FDF9F1] px-3 py-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-xs font-black text-black">{actividad.nombre}</Text>
                      <Text className="text-[10px] font-semibold text-[#7A6857]">
                        {actividad.bloque} • {actividad.tipo} • {actividad.peso_porcentaje} pts
                      </Text>
                    </View>
                    <View className="rounded-full border-[3px] border-black bg-[#D7ECFF] px-2 py-1">
                      <Text className="text-xs font-black text-black">
                        {promedioActividad}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-2">
                    {estudiantesAMostrar.map((estudiante) => {
                      const nota = estudiante.notas[actividad.id];
                      return (
                        <View
                          key={estudiante.id}
                          className="flex-row items-center justify-between py-1 border-b border-[#DCCEC2]/40"
                        >
                          <Text className="text-[11px] font-semibold text-[#5E5045] flex-1" numberOfLines={1}>
                            {estudiante.nombre_completo}
                          </Text>
                          <Text className="text-[11px] font-black text-black">
                            {nota !== undefined ? nota : '-'}
                          </Text>
                        </View>
                      );
                    })}
                    {!isDesktop && reporte.estudiantes.length > 3 && (
                      <Text className="text-[10px] font-semibold text-[#7A6857] mt-1">
                        +{reporte.estudiantes.length - 3} estudiantes más
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
        
        {/* Controles de paginación para desktop */}
        {mostrarPaginacionDesktop && (
          <View className="mt-2 items-center">
            <Text className="text-xs font-semibold text-[#5E5045] mb-2">
              Mostrando {((paginaEstudiantes - 1) * estudiantesPorPagina) + 1}-
              {Math.min(paginaEstudiantes * estudiantesPorPagina, reporte.estudiantes.length)} de {reporte.estudiantes.length} estudiantes
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => setPaginaEstudiantes(prev => Math.max(1, prev - 1))}
                disabled={paginaEstudiantes === 1}
                className={`rounded-lg border-[2px] border-black px-4 py-2 ${paginaEstudiantes === 1 ? 'bg-gray-200' : 'bg-[#D7ECFF]'}`}
              >
                <Text className="text-xs font-black text-black">Anterior</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => setPaginaEstudiantes(prev => prev + 1)}
                disabled={paginaEstudiantes * estudiantesPorPagina >= reporte.estudiantes.length}
                className={`rounded-lg border-[2px] border-black px-4 py-2 ${paginaEstudiantes * estudiantesPorPagina >= reporte.estudiantes.length ? 'bg-gray-200' : 'bg-[#D7ECFF]'}`}
              >
                <Text className="text-xs font-black text-black">Siguiente</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDetalleEstudiante = () => {
    if (!estudianteDetalle || !reporte) return null;

    const promedio = calcularPromedioPonderado(estudianteDetalle.notas, reporte.actividades);

    return (
      <Modal
        visible={!!estudianteDetalle}
        transparent
        animationType="fade"
        onRequestClose={() => setEstudianteDetalle(null)}
      >
        <Pressable className="flex-1 bg-black/35" onPress={() => setEstudianteDetalle(null)}>
          <View className="flex-1 justify-center px-5">
            <Pressable className="rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5">
              <View className="items-center mb-4">
                <View className="h-20 w-20 items-center justify-center rounded-full border-[4px] border-black bg-[#FDF9F1]">
                  <ClipboardSticker size={48} />
                </View>
              </View>

              <Text className="text-xl font-black text-black text-center">
                {estudianteDetalle.nombre_completo}
              </Text>

              {estudianteDetalle.identificacion && (
                <Text className="text-sm font-semibold text-[#5E5045] text-center mt-1">
                  ID: {estudianteDetalle.identificacion}
                </Text>
              )}

              <View className="mt-4 rounded-2xl border-[3px] border-black bg-[#D7ECFF] px-4 py-3">
                <Text className="text-xs font-black uppercase tracking-wide text-[#44596A]">
                  Promedio ponderado
                </Text>
                <Text className="text-3xl font-black text-black text-center mt-1">
                  {promedio}
                </Text>
              </View>

              <View className="mt-4">
                <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                  Notas por actividad
                </Text>

                <ScrollView className="mt-2 max-h-[200px]">
                  {reporte.actividades.map((actividad) => {
                    const nota = estudianteDetalle.notas[actividad.id];
                    return (
                      <View
                        key={actividad.id}
                        className="flex-row items-center justify-between py-2 border-b border-[#DCCEC2]/60"
                      >
                        <View className="flex-1 mr-3">
                          <Text className="text-sm font-semibold text-black" numberOfLines={1}>
                            {actividad.nombre}
                          </Text>
                          <Text className="text-[10px] font-medium text-[#7A6857]">
                            {actividad.parcial} • {actividad.tipo}
                          </Text>
                        </View>
                        <View className="rounded-xl border-[3px] border-black bg-[#FFF7E8] px-3 py-1">
                          <Text className="text-sm font-black text-black">
                            {nota !== undefined ? nota : '-'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={() => setEstudianteDetalle(null)}
                className="mt-4 rounded-xl border-[3px] border-black bg-[#FFD98E] px-4 py-3"
              >
                <Text className="text-center text-sm font-black text-black">Cerrar</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View className="flex-1 bg-[#C5A07D] px-4 pt-12 pb-4">
      <AlertModal
        visible={feedbackModal.visible}
        payload={feedbackModal.payload}
        onClose={closeFeedback}
      />

      {renderDetalleEstudiante()}

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

            <Text className="mt-2 text-xl font-black text-[#1E140D]">Reportes de notas</Text>
            <Text className="mt-1 text-xs font-semibold text-[#5E5045]">
              Consulta calificaciones por grupo y estudiante.
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
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 180,
                minHeight: '100%',
              }}
            >
              <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-5 py-2">
                <Text className="text-sm font-black text-black">Selecciona un grupo</Text>
              </View>

              <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                  Buscar grupo
                </Text>
                <Text
                  className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2 text-base font-bold text-black"
                  style={{ display: 'none' }}
                >
                  {filtroGrupo}
                </Text>
              </View>

              {renderChip(
                'Grupo',
                grupoItems,
                selectedGrupoId,
                setSelectedGrupoId,
                'No hay grupos registrados.'
              )}

              {reporte && (
                <>
                  <View className="mt-3 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3">
                    <Text className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      Información del grupo
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-[#5E5045]">
                      {reporte.grupo.asignatura} • {reporte.grupo.carrera}
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-[#5E5045]">
                      {reporte.grupo.anio} • {reporte.grupo.nombre}
                      {reporte.grupo.turno ? ` (${reporte.grupo.turno})` : ''}
                    </Text>
                  </View>

                  {renderEstadisticas()}

                  {!isMobileWeb && !isAndroid && (
                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.9}
                        onPress={() => setVistaMode('tabla')}
                        className={`flex-1 rounded-xl border-[3px] border-black px-4 py-2 ${
                          vistaMode === 'tabla' ? 'bg-[#D7ECFF]' : 'bg-[#F3E7D5]'
                        }`}
                      >
                        <Text className="text-center text-xs font-black text-black">
                          Vista tabla
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.9}
                        onPress={() => setVistaMode('agrupada')}
                        className={`flex-1 rounded-xl border-[3px] border-black px-4 py-2 ${
                          vistaMode === 'agrupada' ? 'bg-[#D7ECFF]' : 'bg-[#F3E7D5]'
                        }`}
                      >
                        <Text className="text-center text-xs font-black text-black">
                          Vista agrupada
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {loadingReporte ? (
                    <View className="mt-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <View key={`sk-${i}`} className="border-b border-[#DCCEC2] py-3 flex-row items-center justify-between">
                          <View className="flex-1">
                            <InlineSkeleton width={`${Math.floor(Math.random() * 40 + 40)}%`} height={18} />
                            <InlineSkeleton width="30%" height={12} />
                          </View>
                          <InlineSkeleton width={40} height={20} />
                        </View>
                      ))}
                    </View>
                  ) : reporte.actividades.length === 0 ? (
                    <View className="mt-4 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-6 items-center">
                      <MemoSticker size={48} />
                      <Text className="text-center text-sm font-semibold text-[#5E5045] mt-2">
                        Este grupo no tiene actividades configuradas.
                      </Text>
                    </View>
                  ) : reporte.estudiantes.length === 0 ? (
                    <View className="mt-4 rounded-2xl border-[3px] border-black bg-[#FFF7E8] px-4 py-6 items-center">
                      <GroupSticker size={48} />
                      <Text className="text-center text-sm font-semibold text-[#5E5045] mt-2">
                        No hay estudiantes matriculados en este grupo.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {!isAndroid && (
                        <View className="mt-3 self-start rounded-full border-[3px] border-black bg-[#BDE9C7] px-4 py-1">
                          <Text className="text-xs font-black text-black">
                            Toca un estudiante para ver detalle
                          </Text>
                        </View>
                      )}

                      {vistaMode === 'tabla' ? renderVistaTabla() : renderVistaAgrupada()}
                    </>
                  )}

                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.9}
                    onPress={() => {
                      showFeedback(
                        'info',
                        'Próximamente',
                        'La exportación a Excel y PDF estará disponible pronto.'
                      );
                    }}
                    className="mt-4 rounded-xl border-[3px] border-black bg-[#FFD98E] px-4 py-3"
                  >
                    <Text className="text-center text-sm font-black text-black">
                      Exportar reporte
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {loadingReporte && !reporte && (
                <View className="mt-4 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <View key={`sk-${i}`} className="border-b border-[#DCCEC2] py-3 flex-row items-center justify-between">
                       <InlineSkeleton width="60%" height={16} />
                       <InlineSkeleton width="20%" height={16} />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
