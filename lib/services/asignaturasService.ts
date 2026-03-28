import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Asignatura = {
  id: string;
  anio_id: string;
  nombre: string;
  created_at: string;
};

export type CreateAsignaturaInput = {
  anio_id: string;
  nombre: string;
};

export type UpdateAsignaturaInput = {
  nombre?: string;
};

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre de la asignatura es obligatorio.';
  }
  if (clean.length > 100) {
    return 'El nombre de la asignatura no puede superar 100 caracteres.';
  }
  return null;
}

export async function listAsignaturas(): Promise<ServiceResult<Asignatura[]>> {
  const { data, error } = await supabase
    .from('asignaturas')
    .select('id, anio_id, nombre, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las asignaturas.', error.message);
  }

  return ok((data as Asignatura[]) ?? []);
}

export async function listAsignaturasByAnio(
  anioId: string
): Promise<ServiceResult<Asignatura[]>> {
  if (!anioId?.trim()) {
    return fail('El id del año es obligatorio.');
  }

  const { data, error } = await supabase
    .from('asignaturas')
    .select('id, anio_id, nombre, created_at')
    .eq('anio_id', anioId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las asignaturas del año.', error.message);
  }

  return ok((data as Asignatura[]) ?? []);
}

export async function getAsignaturaById(
  id: string
): Promise<ServiceResult<Asignatura | null>> {
  if (!id?.trim()) {
    return fail('El id de la asignatura es obligatorio.');
  }

  const { data, error } = await supabase
    .from('asignaturas')
    .select('id, anio_id, nombre, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar la asignatura.', error.message);
  }

  return ok((data as Asignatura | null) ?? null);
}

export async function createAsignatura(
  input: CreateAsignaturaInput
): Promise<ServiceResult<Asignatura>> {
  if (!input.anio_id?.trim()) {
    return fail('El año es obligatorio para crear la asignatura.');
  }

  const validation = validateNombre(input.nombre);
  if (validation) {
    return fail(validation);
  }

  const payload = {
    anio_id: input.anio_id,
    nombre: input.nombre.trim(),
  };

  const { data, error } = await supabase
    .from('asignaturas')
    .insert(payload)
    .select('id, anio_id, nombre, created_at')
    .single();

  if (error) {
    return fail('No se pudo crear la asignatura.', error.message);
  }

  return ok(data as Asignatura);
}

export async function updateAsignatura(
  id: string,
  input: UpdateAsignaturaInput
): Promise<ServiceResult<Asignatura>> {
  if (!id?.trim()) {
    return fail('El id de la asignatura es obligatorio.');
  }

  const updates: UpdateAsignaturaInput = {};

  if (input.nombre !== undefined) {
    const validation = validateNombre(input.nombre);
    if (validation) {
      return fail(validation);
    }
    updates.nombre = input.nombre.trim();
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en la asignatura.');
  }

  const { data, error } = await supabase
    .from('asignaturas')
    .update(updates)
    .eq('id', id)
    .select('id, anio_id, nombre, created_at')
    .single();

  if (error) {
    return fail('No se pudo actualizar la asignatura.', error.message);
  }

  return ok(data as Asignatura);
}

export async function deleteAsignatura(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id de la asignatura es obligatorio.');
  }

  const { error } = await supabase.from('asignaturas').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar la asignatura.', error.message);
  }

  return ok({ id });
}
