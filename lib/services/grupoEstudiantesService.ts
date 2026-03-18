import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type GrupoEstudiante = {
  grupo_id: string;
  estudiante_id: string;
};

export type CreateGrupoEstudianteInput = GrupoEstudiante;

export async function listGrupoEstudiantes(): Promise<ServiceResult<GrupoEstudiante[]>> {
  const { data, error } = await supabase.from('grupo_estudiantes').select('*');

  if (error) {
    return fail('No se pudieron cargar las matrículas de grupo.', error.message);
  }

  return ok((data as GrupoEstudiante[]) ?? []);
}

export async function listGrupoEstudiantesByGrupo(
  grupoId: string
): Promise<ServiceResult<GrupoEstudiante[]>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { data, error } = await supabase
    .from('grupo_estudiantes')
    .select('*')
    .eq('grupo_id', grupoId);

  if (error) {
    return fail('No se pudieron cargar los estudiantes del grupo.', error.message);
  }

  return ok((data as GrupoEstudiante[]) ?? []);
}

export async function listGrupoEstudiantesByEstudiante(
  estudianteId: string
): Promise<ServiceResult<GrupoEstudiante[]>> {
  if (!estudianteId?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  const { data, error } = await supabase
    .from('grupo_estudiantes')
    .select('*')
    .eq('estudiante_id', estudianteId);

  if (error) {
    return fail('No se pudieron cargar los grupos del estudiante.', error.message);
  }

  return ok((data as GrupoEstudiante[]) ?? []);
}

export async function listGrupoEstudiantesByEstudiantes(
  estudianteIds: string[]
): Promise<ServiceResult<GrupoEstudiante[]>> {
  const ids = estudianteIds.map((id) => id?.trim()).filter((id): id is string => !!id);
  if (ids.length === 0) {
    return ok([]);
  }

  const { data, error } = await supabase
    .from('grupo_estudiantes')
    .select('*')
    .in('estudiante_id', ids);

  if (error) {
    return fail('No se pudieron cargar los grupos de los estudiantes.', error.message);
  }

  return ok((data as GrupoEstudiante[]) ?? []);
}

export async function createGrupoEstudiante(
  input: CreateGrupoEstudianteInput
): Promise<ServiceResult<GrupoEstudiante>> {
  if (!input.grupo_id?.trim() || !input.estudiante_id?.trim()) {
    return fail('Grupo y estudiante son obligatorios para matricular.');
  }

  const payload = {
    grupo_id: input.grupo_id,
    estudiante_id: input.estudiante_id,
  };

  const { data, error } = await supabase
    .from('grupo_estudiantes')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    const isDuplicate =
      error.code === '23505' ||
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique');

    if (isDuplicate) {
      return fail('El estudiante ya está matriculado en este grupo.', error.message);
    }

    return fail('No se pudo matricular el estudiante en el grupo.', error.message);
  }

  return ok(data as GrupoEstudiante);
}

export async function deleteGrupoEstudiante(
  grupoId: string,
  estudianteId: string
): Promise<ServiceResult<{ grupo_id: string; estudiante_id: string }>> {
  if (!grupoId?.trim() || !estudianteId?.trim()) {
    return fail('Grupo y estudiante son obligatorios para eliminar la matrícula.');
  }

  const { error } = await supabase
    .from('grupo_estudiantes')
    .delete()
    .eq('grupo_id', grupoId)
    .eq('estudiante_id', estudianteId);

  if (error) {
    return fail('No se pudo eliminar la matrícula del estudiante.', error.message);
  }

  return ok({ grupo_id: grupoId, estudiante_id: estudianteId });
}
