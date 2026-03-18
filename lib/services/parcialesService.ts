import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Parcial = {
  id: string;
  grupo_id: string;
  nombre: string;
  peso_porcentaje: number;
  created_at: string;
};

export type CreateParcialInput = {
  grupo_id: string;
  nombre: string;
  peso_porcentaje?: number;
};

export type UpdateParcialInput = {
  nombre?: string;
  peso_porcentaje?: number;
};

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre del parcial es obligatorio.';
  }
  if (clean.length > 50) {
    return 'El nombre del parcial no puede superar 50 caracteres.';
  }
  return null;
}

function validatePeso(peso?: number): string | null {
  if (peso === undefined) {
    return null;
  }

  if (Number.isNaN(peso)) {
    return 'El peso del parcial debe ser un número válido.';
  }

  if (peso < 0 || peso > 100) {
    return 'El peso del parcial debe estar entre 0 y 100.';
  }

  return null;
}

export async function listParciales(): Promise<ServiceResult<Parcial[]>> {
  const { data, error } = await supabase
    .from('parciales')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los parciales.', error.message);
  }

  return ok((data as Parcial[]) ?? []);
}

export async function listParcialesByGrupo(
  grupoId: string
): Promise<ServiceResult<Parcial[]>> {
  if (!grupoId?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { data, error } = await supabase
    .from('parciales')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los parciales del grupo.', error.message);
  }

  return ok((data as Parcial[]) ?? []);
}

export async function getParcialById(id: string): Promise<ServiceResult<Parcial | null>> {
  if (!id?.trim()) {
    return fail('El id del parcial es obligatorio.');
  }

  const { data, error } = await supabase
    .from('parciales')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar el parcial.', error.message);
  }

  return ok((data as Parcial | null) ?? null);
}

export async function createParcial(
  input: CreateParcialInput
): Promise<ServiceResult<Parcial>> {
  if (!input.grupo_id?.trim()) {
    return fail('El grupo es obligatorio para crear el parcial.');
  }

  const validationNombre = validateNombre(input.nombre);
  if (validationNombre) {
    return fail(validationNombre);
  }

  const validationPeso = validatePeso(input.peso_porcentaje);
  if (validationPeso) {
    return fail(validationPeso);
  }

  const payload = {
    grupo_id: input.grupo_id,
    nombre: input.nombre.trim(),
    peso_porcentaje: input.peso_porcentaje ?? 0,
  };

  const { data, error } = await supabase
    .from('parciales')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo crear el parcial.', error.message);
  }

  return ok(data as Parcial);
}

export async function updateParcial(
  id: string,
  input: UpdateParcialInput
): Promise<ServiceResult<Parcial>> {
  if (!id?.trim()) {
    return fail('El id del parcial es obligatorio.');
  }

  const updates: UpdateParcialInput = {};

  if (input.nombre !== undefined) {
    const validationNombre = validateNombre(input.nombre);
    if (validationNombre) {
      return fail(validationNombre);
    }
    updates.nombre = input.nombre.trim();
  }

  if (input.peso_porcentaje !== undefined) {
    const validationPeso = validatePeso(input.peso_porcentaje);
    if (validationPeso) {
      return fail(validationPeso);
    }
    updates.peso_porcentaje = input.peso_porcentaje;
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en el parcial.');
  }

  const { data, error } = await supabase
    .from('parciales')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo actualizar el parcial.', error.message);
  }

  return ok(data as Parcial);
}

export async function deleteParcial(id: string): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id del parcial es obligatorio.');
  }

  const { error } = await supabase.from('parciales').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar el parcial.', error.message);
  }

  return ok({ id });
}
