import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from './_auth';
import { fail, ok, ServiceResult } from './_result';

export type Carrera = {
  id: string;
  profesor_id: string;
  nombre: string;
  created_at: string;
};

export type CreateCarreraInput = {
  nombre: string;
};

export type UpdateCarreraInput = {
  nombre?: string;
};

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre de la carrera es obligatorio.';
  }
  if (clean.length > 100) {
    return 'El nombre de la carrera no puede superar 100 caracteres.';
  }
  return null;
}

export async function listCarreras(): Promise<ServiceResult<Carrera[]>> {
  const { data, error } = await supabase
    .from('carreras')
    .select('id, profesor_id, nombre, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las carreras.', error.message);
  }

  return ok((data as Carrera[]) ?? []);
}

export async function getCarreraById(id: string): Promise<ServiceResult<Carrera | null>> {
  const { data, error } = await supabase
    .from('carreras')
    .select('id, profesor_id, nombre, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar la carrera.', error.message);
  }

  return ok((data as Carrera | null) ?? null);
}

export async function createCarrera(
  input: CreateCarreraInput
): Promise<ServiceResult<Carrera>> {
  const validation = validateNombre(input.nombre);
  if (validation) {
    return fail(validation);
  }

  const user = await getCurrentUserId();
  if (!user.ok) {
    return user;
  }

  const payload = {
    profesor_id: user.data,
    nombre: input.nombre.trim(),
  };

  const { data, error } = await supabase
    .from('carreras')
    .insert(payload)
    .select('id, profesor_id, nombre, created_at')
    .single();

  if (error) {
    return fail('No se pudo crear la carrera.', error.message);
  }

  return ok(data as Carrera);
}

export async function updateCarrera(
  id: string,
  input: UpdateCarreraInput
): Promise<ServiceResult<Carrera>> {
  if (!id?.trim()) {
    return fail('El id de la carrera es obligatorio.');
  }

  const updates: UpdateCarreraInput = {};

  if (input.nombre !== undefined) {
    const validation = validateNombre(input.nombre);
    if (validation) {
      return fail(validation);
    }
    updates.nombre = input.nombre.trim();
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en la carrera.');
  }

  const { data, error } = await supabase
    .from('carreras')
    .update(updates)
    .eq('id', id)
    .select('id, profesor_id, nombre, created_at')
    .single();

  if (error) {
    return fail('No se pudo actualizar la carrera.', error.message);
  }

  return ok(data as Carrera);
}

export async function deleteCarrera(id: string): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id de la carrera es obligatorio.');
  }

  const { error } = await supabase.from('carreras').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar la carrera.', error.message);
  }

  return ok({ id });
}
