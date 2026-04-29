import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from './_auth';
import { ServiceResult, fail, ok } from './_result';
import { validateFecha, validateRequiredId } from './validation';

export type AsistenciaSesion = {
  id: string;
  grupo_id: string;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  tema?: string | null;
  created_at: string;
};

export type AsistenciaRegistro = {
  id: string;
  sesion_id: string;
  estudiante_id: string;
  estado: 'presente' | 'ausente' | 'justificado' | 'tardanza';
  justificacion_id?: string | null;
  observaciones?: string | null;
  created_at: string;
  updated_at: string;
};

export type AsistenciaJustificacion = {
  id: string;
  estudiante_id: string;
  fecha: string;
  motivo: string;
  comprobante_url?: string | null;
  aprobado: boolean;
  aprobado_por?: string | null;
  created_at: string;
};

export type CreateSesionInput = {
  grupo_id: string;
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  tema?: string;
};

export type UpdateRegistroInput = {
  estado: 'presente' | 'ausente' | 'justificado' | 'tardanza';
  justificacion_id?: string;
  observaciones?: string;
};

export type CreateJustificacionInput = {
  estudiante_id: string;
  fecha: string;
  motivo: string;
  comprobante_url?: string;
};

export type GrupoAsistenciaOption = {
  id: string;
  nombre: string;
  turno: string | null;
  asignatura_id: string;
  asignatura_nombre: string;
  anio_id: string;
  anio_nombre: string;
  carrera_id: string;
  carrera_nombre: string;
};

function validateEstado(estado: string): estado is AsistenciaRegistro['estado'] {
  return ['presente', 'ausente', 'justificado', 'tardanza'].includes(estado);
}

export async function listSesionesByGrupo(
  grupoId: string
): Promise<ServiceResult<AsistenciaSesion[]>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { data, error } = await supabase
    .from('asistencia_sesiones')
    .select('id, grupo_id, fecha, hora_inicio, hora_fin, tema, created_at')
    .eq('grupo_id', grupoId)
    .order('fecha', { ascending: true });

  if (error) {
    return fail('No se pudieron cargar las sesiones.', error.message);
  }

  return ok((data as AsistenciaSesion[]) ?? []);
}

export async function createSesion(
  input: CreateSesionInput
): Promise<ServiceResult<AsistenciaSesion>> {
  if (!input.grupo_id?.trim()) {
    return fail('El grupo es obligatorio.');
  }

  const validation = validateFecha(input.fecha);
  if (validation) {
    return fail(validation);
  }

  const payload = {
    grupo_id: input.grupo_id,
    fecha: input.fecha,
    hora_inicio: input.hora_inicio || null,
    hora_fin: input.hora_fin || null,
    tema: input.tema?.trim() || null,
  };

  const { data, error } = await supabase
    .from('asistencia_sesiones')
    .insert(payload)
    .select('id, grupo_id, fecha, hora_inicio, hora_fin, tema, created_at')
    .single();

  if (error) {
    const isDuplicate =
      error.code === '23505' ||
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique');

    if (isDuplicate) {
      return fail('Ya existe una sesion para este grupo en esa fecha.', error.message);
    }

    return fail('No se pudo crear la sesión.', error.message);
  }

  return ok(data as AsistenciaSesion);
}

export async function deleteSesion(id: string): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id de la sesión es obligatorio.');
  }

  const { error } = await supabase.from('asistencia_sesiones').delete().eq('id', id);

  if (error) {
    return fail('No se pudo eliminar la sesión.', error.message);
  }

  return ok({ id });
}

export async function getRegistrosBySesion(
  sesionId: string
): Promise<ServiceResult<AsistenciaRegistro[]>> {
  if (!sesionId?.trim()) {
    return fail('El id de la sesión es obligatorio.');
  }

  const { data, error } = await supabase
    .from('asistencia_registros')
    .select('id, sesion_id, estudiante_id, estado, justificacion_id, observaciones, created_at, updated_at')
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true });

  if (error) {
    return fail('No se pudieron cargar los registros.', error.message);
  }

  return ok((data as AsistenciaRegistro[]) ?? []);
}

export async function getRegistrosByGrupo(
  grupoId: string,
  estudianteIds: string[]
): Promise<ServiceResult<Record<string, AsistenciaRegistro[]>>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  if (estudianteIds.length === 0) {
    return ok({});
  }

  const { data: sesiones, error: errorSesiones } = await supabase
    .from('asistencia_sesiones')
    .select('id')
    .eq('grupo_id', grupoId)
    .order('fecha', { ascending: true });

  if (errorSesiones) {
    return fail('No se pudieron cargar las sesiones.', errorSesiones.message);
  }

  if (!sesiones || sesiones.length === 0) {
    return ok({});
  }

  const sesionIds = sesiones.map(s => s.id);

  const { data: registros, error: errorRegistros } = await supabase
    .from('asistencia_registros')
    .select('id, sesion_id, estudiante_id, estado, justificacion_id, observaciones, created_at, updated_at')
    .in('sesion_id', sesionIds)
    .in('estudiante_id', estudianteIds);

  if (errorRegistros) {
    return fail('No se pudieron cargar los registros.', errorRegistros.message);
  }

  const grouped: Record<string, AsistenciaRegistro[]> = {};
  
  for (const sesion of sesiones) {
    grouped[sesion.id] = (registros ?? [])
      .filter(r => r.sesion_id === sesion.id)
      .sort((a, b) => a.estudiante_id.localeCompare(b.estudiante_id));
  }

  return ok(grouped);
}

export async function upsertRegistro(
  sesionId: string,
  estudianteId: string,
  input: UpdateRegistroInput
): Promise<ServiceResult<void>> {
  if (!sesionId?.trim()) {
    return fail('El id de la sesión es obligatorio.');
  }

  if (!estudianteId?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  if (!validateEstado(input.estado)) {
    return fail('El estado de asistencia no es válido.');
  }

  const payload = {
    sesion_id: sesionId,
    estudiante_id: estudianteId,
    estado: input.estado,
    justificacion_id: input.justificacion_id || null,
    observaciones: input.observaciones?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.rpc('upsert_asistencia_registro', {
    p_sesion_id: payload.sesion_id,
    p_estudiante_id: payload.estudiante_id,
    p_estado: payload.estado,
    p_justificacion_id: payload.justificacion_id,
    p_observaciones: payload.observaciones,
  });

  if (error) {
    return fail('No se pudo actualizar la asistencia.', error.message);
  }

  return ok(undefined);
}

export async function getEstudiantesNuncaPresentados(
  grupoId: string,
  estudianteIds: string[]
): Promise<ServiceResult<{ estudiante_id: string; total_presentes: number }[]>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  if (estudianteIds.length === 0) {
    return ok([]);
  }

  const { data: sesiones } = await supabase
    .from('asistencia_sesiones')
    .select('id')
    .eq('grupo_id', grupoId);

  if (!sesiones || sesiones.length === 0) {
    return ok([]);
  }

  const sesionIds = sesiones.map(s => s.id);

  const { data, error } = await supabase
    .from('asistencia_registros')
    .select('estudiante_id, estado')
    .in('sesion_id', sesionIds)
    .in('estudiante_id', estudianteIds)
    .eq('estado', 'presente');

  if (error) {
    return fail('No se pudieron cargar los datos.', error.message);
  }

  const conteoPorEstudiante: Record<string, number> = {};
  
  for (const registro of data ?? []) {
    conteoPorEstudiante[registro.estudiante_id] = 
      (conteoPorEstudiante[registro.estudiante_id] || 0) + 1;
  }

  const resultado = estudianteIds
    .filter(id => !conteoPorEstudiante[id] || conteoPorEstudiante[id] === 0)
    .map(id => ({
      estudiante_id: id,
      total_presentes: conteoPorEstudiante[id] || 0,
    }));

  return ok(resultado);
}

export async function listJustificacionesByEstudiante(
  estudianteId: string
): Promise<ServiceResult<AsistenciaJustificacion[]>> {
  if (!estudianteId?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  const { data, error } = await supabase
    .from('asistencia_justificaciones')
    .select('id, estudiante_id, fecha, motivo, comprobante_url, aprobado, aprobado_por, created_at')
    .eq('estudiante_id', estudianteId)
    .order('fecha', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las justificaciones.', error.message);
  }

  return ok((data as AsistenciaJustificacion[]) ?? []);
}

export async function listJustificacionesByEstudiantes(
  estudianteIds: string[],
  pageSize = 500,
): Promise<ServiceResult<AsistenciaJustificacion[]>> {
  const ids = estudianteIds.map((id) => id?.trim()).filter((id): id is string => !!id);
  if (ids.length === 0) {
    return ok([]);
  }

  const { data, error } = await supabase
    .from('asistencia_justificaciones')
    .select('id, estudiante_id, fecha, motivo, comprobante_url, aprobado, aprobado_por, created_at')
    .in('estudiante_id', ids)
    .order('fecha', { ascending: false })
    .limit(pageSize);

  if (error) {
    return fail('No se pudieron cargar las justificaciones.', error.message);
  }

  return ok((data as AsistenciaJustificacion[]) ?? []);
}

export async function createJustificacion(
  input: CreateJustificacionInput
): Promise<ServiceResult<AsistenciaJustificacion>> {
  if (!input.estudiante_id?.trim()) {
    return fail('El estudiante es obligatorio.');
  }

  const validation = validateFecha(input.fecha);
  if (validation) {
    return fail(validation);
  }

  if (!input.motivo?.trim()) {
    return fail('El motivo de la justificación es obligatorio.');
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return fail('No se pudo identificar al usuario.');
  }

  const payload = {
    estudiante_id: input.estudiante_id,
    fecha: input.fecha,
    motivo: input.motivo.trim(),
    comprobante_url: input.comprobante_url?.trim() || null,
    aprobado: false,
    aprobado_por: null,
  };

  const { data, error } = await supabase
    .from('asistencia_justificaciones')
    .insert(payload)
    .select('id, estudiante_id, fecha, motivo, comprobante_url, aprobado, aprobado_por, created_at')
    .single();

  if (error) {
    return fail('No se pudo crear la justificación.', error.message);
  }

  return ok(data as AsistenciaJustificacion);
}

export async function approveJustificacion(
  id: string,
  aprobado: boolean
): Promise<ServiceResult<AsistenciaJustificacion>> {
  if (!id?.trim()) {
    return fail('El id de la justificación es obligatorio.');
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return fail('No se pudo identificar al usuario.');
  }

  const { data, error } = await supabase
    .from('asistencia_justificaciones')
    .update({ aprobado, aprobado_por: user.data })
    .eq('id', id)
    .select('id, estudiante_id, fecha, motivo, comprobante_url, aprobado, aprobado_por, created_at')
    .single();

  if (error) {
    return fail('No se pudo actualizar la justificación.', error.message);
  }

  return ok(data as AsistenciaJustificacion);
}

export async function deleteJustificacion(id: string): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id de la justificación es obligatorio.');
  }

  const { error } = await supabase
    .from('asistencia_justificaciones')
    .delete()
    .eq('id', id);

  if (error) {
    return fail('No se pudo eliminar la justificación.', error.message);
  }

  return ok({ id });
}

export async function getEstudiantesEnGrupo(
  grupoId: string
): Promise<ServiceResult<{ estudiante_id: string }[]>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { data, error } = await supabase
    .from('grupo_estudiantes')
    .select('estudiante_id')
    .eq('grupo_id', grupoId);

  if (error) {
    return fail('No se pudieron cargar los estudiantes del grupo.', error.message);
  }

  return ok((data as { estudiante_id: string }[]) ?? []);
}

export async function listGruposAsistenciaByProfesor(): Promise<
  ServiceResult<GrupoAsistenciaOption[]>
> {
  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  // Single join query: grupos → asignaturas → anios → carreras
  // This replaces the previous N+1 pattern (4 sequential queries)
  const { data, error } = await supabase
    .from('grupos')
    .select(`
      id,
      nombre,
      turno,
      asignatura:asignaturas!inner(
        id,
        nombre,
        anio:anios!inner(
          id,
          nombre,
          carrera:carreras!inner(
            id,
            nombre
          )
        )
      )
    `)
    .eq('asignatura.anio.carrera.profesor_id', user.data)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los grupos.', error.message);
  }

  // The Supabase join returns `asignatura` as an array even for FK relationships
  const raw = data as Array<{
    id: string;
    nombre: string;
    turno: string | null;
    asignatura: Array<{
      id: string;
      nombre: string;
      anio: Array<{
        id: string;
        nombre: string;
        carrera: Array<{
          id: string;
          nombre: string;
        }>;
      }>;
    }>;
  }> | null;

  if (!raw || raw.length === 0) {
    return ok([]);
  }

  const result: GrupoAsistenciaOption[] = raw
    .map((grupo) => {
      const asignatura = grupo.asignatura?.[0];
      const anio = asignatura?.anio?.[0];
      const carrera = anio?.carrera?.[0];
      if (!asignatura || !anio || !carrera) return null;

      return {
        id: grupo.id,
        nombre: grupo.nombre,
        turno: grupo.turno ?? null,
        asignatura_id: asignatura.id,
        asignatura_nombre: asignatura.nombre,
        anio_id: anio.id,
        anio_nombre: anio.nombre,
        carrera_id: carrera.id,
        carrera_nombre: carrera.nombre,
      };
    })
    .filter((item): item is GrupoAsistenciaOption => !!item);

  return ok(result);
}

export async function listContextoGrupoByGrupoId(grupoId: string): Promise<
  ServiceResult<{
    carrera_nombre: string;
    anio_nombre: string;
    asignatura_nombre: string;
    grupo_nombre: string;
    turno: string | null;
  } | null>
> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { data, error } = await supabase
    .from('grupos')
    .select(
      'nombre, turno, asignaturas!inner(nombre, anios!inner(nombre, carreras!inner(nombre, profesor_id)))'
    )
    .eq('id', grupoId)
    .maybeSingle();

  if (error) {
    return fail('No se pudo cargar el contexto del grupo.', error.message);
  }

  if (!data) {
    return ok(null);
  }

  const raw: any = data;
  const asignatura = raw.asignaturas;
  const anio = asignatura?.anios;
  const carrera = anio?.carreras;

  return ok({
    carrera_nombre: String(carrera?.nombre ?? ''),
    anio_nombre: String(anio?.nombre ?? ''),
    asignatura_nombre: String(asignatura?.nombre ?? ''),
    grupo_nombre: String(raw.nombre ?? ''),
    turno: raw.turno ?? null,
  });
}
