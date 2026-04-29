import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';
import { validateNombre, validateRequiredId } from './validation';

export type Anio = {
  id: string;
  carrera_id: string;
  nombre: string;
  created_at: string;
};

export type CreateAnioInput = {
  carrera_id: string;
  nombre: string;
};

export type UpdateAnioInput = {
  nombre?: string;
};

export async function listAnios(): Promise<ServiceResult<Anio[]>> {
  const { data, error } = await supabase
    .from('anios')
    .select('id, carrera_id, nombre, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los años.', error.message);
  }

  return ok((data as Anio[]) ?? []);
}

export async function listAniosByCarrera(carreraId: string): Promise<ServiceResult<Anio[]>> {
  const idErr = validateRequiredId(carreraId, 'carrera');
  if (idErr) return fail(idErr);

  const { data, error } = await supabase
    .from('anios')
    .select('id, carrera_id, nombre, created_at')
    .eq('carrera_id', carreraId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los años de la carrera.', error.message);
  }

  return ok((data as Anio[]) ?? []);
}

export async function getAnioById(id: string): Promise<ServiceResult<Anio | null>> {
  const idErr = validateRequiredId(id, 'año');
  if (idErr) return fail(idErr);

  const { data, error } = await supabase
    .from('anios')
    .select('id, carrera_id, nombre, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar el año.', error.message);
  }

  return ok((data as Anio | null) ?? null);
}

export async function createAnio(input: CreateAnioInput): Promise<ServiceResult<Anio>> {
  if (!input.carrera_id?.trim()) {
    return fail('La carrera es obligatoria para crear el año.');
  }

  const validation = validateNombre(input.nombre, 'Nombre del año', 50);
  if (validation) {
    return fail(validation);
  }

  const payload = {
    carrera_id: input.carrera_id,
    nombre: input.nombre.trim(),
  };

  const { data, error } = await supabase
    .from('anios')
    .insert(payload)
    .select('id, carrera_id, nombre, created_at')
    .single();

  if (error) {
    return fail('No se pudo crear el año.', error.message);
  }

  return ok(data as Anio);
}

export async function updateAnio(
  id: string,
  input: UpdateAnioInput
): Promise<ServiceResult<Anio>> {
  const idErr = validateRequiredId(id, 'año');
  if (idErr) return fail(idErr);

  const updates: UpdateAnioInput = {};

  if (input.nombre !== undefined) {
    const validation = validateNombre(input.nombre, 'Nombre del año', 50);
    if (validation) {
      return fail(validation);
    }
    updates.nombre = input.nombre.trim();
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en el año.');
  }

  const { data, error } = await supabase
    .from('anios')
    .update(updates)
    .eq('id', id)
    .select('id, carrera_id, nombre, created_at')
    .single();

  if (error) {
    return fail('No se pudo actualizar el año.', error.message);
  }

  return ok(data as Anio);
}

export async function deleteAnio(id: string): Promise<ServiceResult<{ id: string }>> {
  const idErr = validateRequiredId(id, 'año');
  if (idErr) return fail(idErr);

  const { error } = await supabase.from('anios').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar el año.', error.message);
  }

  return ok({ id });
}
