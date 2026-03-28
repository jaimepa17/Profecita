import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type ReporteGrupo = {
  grupo: {
    id: string;
    nombre: string;
    turno?: string;
    asignatura: string;
    carrera: string;
    anio: string;
  };
  actividades: Array<{
    id: string;
    nombre: string;
    tipo: 'corte' | 'examen';
    peso_porcentaje: number;
    puntaje_maximo: number;
    parcial: string;
    bloque: string;
  }>;
  estudiantes: Array<{
    id: string;
    nombre_completo: string;
    identificacion?: string;
    notas: Record<string, number>;
  }>;
  estadisticas: {
    promedioGeneral: number;
    notaMasAlta: number;
    notaMasBaja: number;
    totalEstudiantes: number;
    totalActividades: number;
    promedioPorActividad: Record<string, number>;
  };
};

type GrupoRow = {
  id: string;
  nombre: string;
  turno?: string;
  asignaturas: {
    nombre: string;
    anios: {
      nombre: string;
      carreras: {
        nombre: string;
      }[];
    }[];
  }[];
};

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getReporteNotasPorGrupo(
  grupoId: string
): Promise<ServiceResult<ReporteGrupo>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  try {
    // 1. Obtener información del grupo con relaciones anidadas
    const { data: grupoData, error: grupoError } = await supabase
      .from('grupos')
      .select(
        `
        id,
        nombre,
        turno,
        asignaturas!inner (
          nombre,
          anios!inner (
            nombre,
            carreras!inner (
              nombre
            )
          )
        )
      `
      )
      .eq('id', grupoId)
      .single();

    if (grupoError) {
      return fail('No se pudo cargar la información del grupo.', grupoError.message);
    }

    if (!grupoData) {
      return fail('El grupo no existe.');
    }

    const grupo = grupoData as GrupoRow;

    // 2. Obtener parciales, bloques y actividades en una sola consulta con joins
    const { data: actividadesNested, error: actividadesError } = await supabase
      .from('parciales')
      .select(
        `
        id,
        nombre,
        peso_porcentaje,
        bloques (
          id,
          nombre,
          peso_porcentaje,
          actividades (
            id,
            nombre,
            tipo,
            peso_porcentaje,
            puntaje_maximo
          )
        )
      `
      )
      .eq('grupo_id', grupoId)
      .order('created_at');

    if (actividadesError) {
      return fail('No se pudieron cargar las actividades.', actividadesError.message);
    }

    // Aplanar la estructura anidada
    const actividades: ReporteGrupo['actividades'] = [];
    const parcialesMap = new Map<string, { nombre: string }>();
    const bloquesMap = new Map<string, { nombre: string }>();

    (actividadesNested ?? []).forEach((parcial) => {
      parcialesMap.set(parcial.id, { nombre: parcial.nombre });
      
      (parcial.bloques ?? []).forEach((bloque) => {
        bloquesMap.set(bloque.id, { nombre: bloque.nombre });
        
        (bloque.actividades ?? []).forEach((actividad) => {
          actividades.push({
            id: actividad.id,
            nombre: actividad.nombre,
            tipo: actividad.tipo as 'corte' | 'examen',
            peso_porcentaje: Number(actividad.peso_porcentaje ?? 0),
            puntaje_maximo: Number(actividad.puntaje_maximo ?? 0),
            parcial: parcial.nombre,
            bloque: bloque.nombre,
          });
        });
      });
    });

    // 3. Obtener estudiantes del grupo con una sola consulta (usando join)
    const { data: grupoEstudiantes, error: estudiantesError } = await supabase
      .from('grupo_estudiantes')
      .select(
        `
        estudiantes (
          id,
          nombre_completo,
          identificacion
        )
      `
      )
      .eq('grupo_id', grupoId)
      .order('nombre_completo', { foreignTable: 'estudiantes' });

    if (estudiantesError) {
      return fail('No se pudieron cargar los estudiantes del grupo.', estudiantesError.message);
    }

    const estudiantesData = (grupoEstudiantes ?? [])
      .map((ge) => ge.estudiantes)
      .filter(Boolean)
      .flat() as Array<{ id: string; nombre_completo: string; identificacion?: string }>;

    if (estudiantesData.length === 0) {
      return ok({
        grupo: {
          id: grupo.id,
          nombre: grupo.nombre,
          turno: grupo.turno,
          asignatura: grupo.asignaturas[0]?.nombre ?? 'Sin asignatura',
          carrera: grupo.asignaturas[0]?.anios[0]?.carreras[0]?.nombre ?? 'Sin carrera',
          anio: grupo.asignaturas[0]?.anios[0]?.nombre ?? 'Sin año',
        },
        actividades: [],
        estudiantes: [],
        estadisticas: {
          promedioGeneral: 0,
          notaMasAlta: 0,
          notaMasBaja: 0,
          totalEstudiantes: 0,
          totalActividades: 0,
          promedioPorActividad: {},
        },
      });
    }

    const estudianteIds = estudiantesData.map((e) => e.id);
    const actividadIds = actividades.map((a) => a.id);

    // 4. Obtener notas para estos estudiantes y actividades
    const { data: notasData, error: notasError } = await supabase
      .from('notas')
      .select('actividad_id, estudiante_id, puntaje_obtenido')
      .in('estudiante_id', estudianteIds)
      .in('actividad_id', actividadIds);

    if (notasError) {
      return fail('No se pudieron cargar las notas.', notasError.message);
    }

    const notasMap = new Map<string, number>();
    (notasData ?? []).forEach((nota) => {
      notasMap.set(`${nota.estudiante_id}_${nota.actividad_id}`, Number(nota.puntaje_obtenido));
    });

    const estudiantes = estudiantesData.map((estudiante) => {
      const notas: Record<string, number> = {};
      actividades.forEach((actividad) => {
        const nota = notasMap.get(`${estudiante.id}_${actividad.id}`);
        if (nota !== undefined) {
          notas[actividad.id] = nota;
        }
      });

      return {
        id: estudiante.id,
        nombre_completo: estudiante.nombre_completo,
        identificacion: estudiante.identificacion,
        notas,
      };
    });

    const estadisticas = calcularEstadisticas(estudiantes, actividades);

    return ok({
      grupo: {
        id: grupo.id,
        nombre: grupo.nombre,
        turno: grupo.turno,
        asignatura: grupo.asignaturas[0]?.nombre ?? 'Sin asignatura',
        carrera: grupo.asignaturas[0]?.anios[0]?.carreras[0]?.nombre ?? 'Sin carrera',
        anio: grupo.asignaturas[0]?.anios[0]?.nombre ?? 'Sin año',
      },
      actividades,
      estudiantes,
      estadisticas,
    });
  } catch (error) {
    return fail('Error inesperado al generar el reporte.');
  }
}

export function calcularPromedioPonderado(
  notas: Record<string, number>,
  actividades: Array<{ id: string; peso_porcentaje: number }>
): number {
  let sumaPonderada = 0;
  let sumaPesos = 0;

  actividades.forEach((actividad) => {
    const nota = notas[actividad.id];
    if (nota !== undefined) {
      sumaPonderada += nota * actividad.peso_porcentaje;
      sumaPesos += actividad.peso_porcentaje;
    }
  });

  if (sumaPesos === 0) {
    return 0;
  }

  return roundTo2(sumaPonderada / sumaPesos);
}

export function calcularEstadisticas(
  estudiantes: Array<{ id: string; notas: Record<string, number> }>,
  actividades: Array<{ id: string; peso_porcentaje: number }>
): ReporteGrupo['estadisticas'] {
  const promediosEstudiantes: number[] = [];
  let notaMasAlta = 0;
  let notaMasBaja = Infinity;

  const notasPorActividad: Record<string, number[]> = {};

  estudiantes.forEach((estudiante) => {
    const promedio = calcularPromedioPonderado(estudiante.notas, actividades);
    promediosEstudiantes.push(promedio);

    Object.entries(estudiante.notas).forEach(([actividadId, nota]) => {
      if (!notasPorActividad[actividadId]) {
        notasPorActividad[actividadId] = [];
      }
      notasPorActividad[actividadId].push(nota);

      if (nota > notaMasAlta) {
        notaMasAlta = nota;
      }
      if (nota < notaMasBaja) {
        notaMasBaja = nota;
      }
    });
  });

  if (notaMasBaja === Infinity) {
    notaMasBaja = 0;
  }

  const promedioGeneral =
    promediosEstudiantes.length > 0
      ? roundTo2(
          promediosEstudiantes.reduce((sum, p) => sum + p, 0) / promediosEstudiantes.length
        )
      : 0;

  const promedioPorActividad: Record<string, number> = {};
  Object.entries(notasPorActividad).forEach(([actividadId, notas]) => {
    promedioPorActividad[actividadId] =
      notas.length > 0
        ? roundTo2(notas.reduce((sum, n) => sum + n, 0) / notas.length)
        : 0;
  });

  return {
    promedioGeneral,
    notaMasAlta: roundTo2(notaMasAlta),
    notaMasBaja: roundTo2(notaMasBaja),
    totalEstudiantes: estudiantes.length,
    totalActividades: actividades.length,
    promedioPorActividad,
  };
}
