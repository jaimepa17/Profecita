import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from './_auth';
import { ServiceResult, fail, ok } from './_result';
import { validateNombre, normalizeString } from './validation';

const DEFAULT_PAGE_SIZE = 500;

export type Estudiante = {
  id: string;
  profesor_id: string;
  nombre_completo: string;
  identificacion?: string | null;
  created_at: string;
};

export type CreateEstudianteInput = {
  nombre_completo: string;
  identificacion?: string | null;
};

export type UpdateEstudianteInput = {
  nombre_completo?: string;
  identificacion?: string | null;
};

export async function listEstudiantes(
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<ServiceResult<Estudiante[]>> {
  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .eq('profesor_id', user.data)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (error) {
    return fail('No se pudieron cargar los estudiantes.', error.message);
  }

  return ok((data as Estudiante[]) ?? []);
}

export async function listEstudiantesByProfesor(
  profesorId: string,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<ServiceResult<Estudiante[]>> {
  if (!profesorId?.trim()) {
    return fail('El id del profesor es obligatorio.');
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .eq('profesor_id', profesorId)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (error) {
    return fail('No se pudieron cargar los estudiantes del profesor.', error.message);
  }

  return ok((data as Estudiante[]) ?? []);
}

export async function listEstudiantesByIds(
  ids: string[]
): Promise<ServiceResult<Estudiante[]>> {
  const validIds = ids.map((id) => id?.trim()).filter((id): id is string => !!id);
  if (validIds.length === 0) {
    return ok([]);
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .in('id', validIds)
    .order('nombre_completo', { ascending: true });

  if (error) {
    return fail('No se pudieron cargar los estudiantes.', error.message);
  }

  return ok((data as Estudiante[]) ?? []);
}

export async function getEstudianteById(
  id: string
): Promise<ServiceResult<Estudiante | null>> {
  if (!id?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .eq('id', id)
    .eq('profesor_id', user.data)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar el estudiante.', error.message);
  }

  return ok((data as Estudiante | null) ?? null);
}

export async function createEstudiante(
  input: CreateEstudianteInput
): Promise<ServiceResult<Estudiante>> {
  const validation = validateNombre(input.nombre_completo, 'Nombre completo del estudiante', 150);
  if (validation) {
    return fail(validation);
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const payload = {
    profesor_id: user.data,
    nombre_completo: input.nombre_completo.trim(),
    identificacion: normalizeString(input.identificacion, 50),
  };

  const { data, error } = await supabase
    .from('estudiantes')
    .insert(payload)
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .single();

  if (error) {
    return fail('No se pudo crear el estudiante.', error.message);
  }

  return ok(data as Estudiante);
}

export async function updateEstudiante(
  id: string,
  input: UpdateEstudianteInput
): Promise<ServiceResult<Estudiante>> {
  if (!id?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const updates: UpdateEstudianteInput = {};

  if (input.nombre_completo !== undefined) {
    const validation = validateNombre(input.nombre_completo, 'Nombre completo del estudiante', 150);
    if (validation) {
      return fail(validation);
    }
    updates.nombre_completo = input.nombre_completo.trim();
  }

  if (input.identificacion !== undefined) {
    updates.identificacion = normalizeString(input.identificacion, 50);
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en el estudiante.');
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .update(updates)
    .eq('id', id)
    .eq('profesor_id', user.data)
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .single();

  if (error) {
    return fail('No se pudo actualizar el estudiante.', error.message);
  }

  return ok(data as Estudiante);
}

export async function deleteEstudiante(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const { error } = await supabase
    .from('estudiantes')
    .delete()
    .eq('id', id)
    .eq('profesor_id', user.data);

  if (error) {
    return fail('No se pudo eliminar el estudiante.', error.message);
  }

  return ok({ id });
}
