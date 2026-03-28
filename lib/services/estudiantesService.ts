import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from './_auth';
import { ServiceResult, fail, ok } from './_result';

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

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre completo del estudiante es obligatorio.';
  }
  if (clean.length > 150) {
    return 'El nombre completo no puede superar 150 caracteres.';
  }
  return null;
}

function normalizeIdentificacion(identificacion?: string | null): string | null {
  const clean = identificacion?.trim();
  if (!clean) {
    return null;
  }
  return clean.slice(0, 50);
}

export async function listEstudiantes(): Promise<ServiceResult<Estudiante[]>> {
  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .eq('profesor_id', user.data)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los estudiantes.', error.message);
  }

  return ok((data as Estudiante[]) ?? []);
}

export async function listEstudiantesByProfesor(
  profesorId: string
): Promise<ServiceResult<Estudiante[]>> {
  if (!profesorId?.trim()) {
    return fail('El id del profesor es obligatorio.');
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .select('id, profesor_id, nombre_completo, identificacion, created_at')
    .eq('profesor_id', profesorId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los estudiantes del profesor.', error.message);
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
  const validation = validateNombre(input.nombre_completo);
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
    identificacion: normalizeIdentificacion(input.identificacion),
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
    const validation = validateNombre(input.nombre_completo);
    if (validation) {
      return fail(validation);
    }
    updates.nombre_completo = input.nombre_completo.trim();
  }

  if (input.identificacion !== undefined) {
    updates.identificacion = normalizeIdentificacion(input.identificacion);
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
