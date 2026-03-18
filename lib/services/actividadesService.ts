import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Actividad = {
  id: string;
  parcial_id: string;
  nombre: string;
  tipo: 'corte' | 'examen';
  peso_porcentaje: number;
  fecha_asignada?: string | null;
  created_at: string;
};

export type CreateActividadInput = {
  parcial_id: string;
  nombre: string;
  tipo: 'corte' | 'examen';
  peso_porcentaje: number;
  fecha_asignada?: string | null;
};

export type UpdateActividadInput = {
  nombre?: string;
  tipo?: 'corte' | 'examen';
  peso_porcentaje?: number;
  fecha_asignada?: string | null;
};

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre de la actividad es obligatorio.';
  }
  if (clean.length > 100) {
    return 'El nombre de la actividad no puede superar 100 caracteres.';
  }
  return null;
}

function validateTipo(tipo?: 'corte' | 'examen'): string | null {
  if (!tipo) {
    return 'El tipo de actividad es obligatorio.';
  }
  if (tipo !== 'corte' && tipo !== 'examen') {
    return 'El tipo de actividad debe ser corte o examen.';
  }
  return null;
}

function validatePeso(peso?: number): string | null {
  if (peso === undefined) {
    return 'El peso de la actividad es obligatorio.';
  }

  if (Number.isNaN(peso)) {
    return 'El peso de la actividad debe ser un número válido.';
  }

  if (peso < 0 || peso > 100) {
    return 'El peso de la actividad debe estar entre 0 y 100.';
  }

  return null;
}

function normalizeFecha(fecha?: string | null): string | null {
  const clean = fecha?.trim();
  if (!clean) {
    return null;
  }
  return clean;
}

export async function listActividades(): Promise<ServiceResult<Actividad[]>> {
  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las actividades.', error.message);
  }

  return ok((data as Actividad[]) ?? []);
}

export async function listActividadesByParcial(
  parcialId: string
): Promise<ServiceResult<Actividad[]>> {
  if (!parcialId?.trim()) {
    return fail('El id del parcial es obligatorio.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('parcial_id', parcialId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las actividades del parcial.', error.message);
  }

  return ok((data as Actividad[]) ?? []);
}

export async function getActividadById(
  id: string
): Promise<ServiceResult<Actividad | null>> {
  if (!id?.trim()) {
    return fail('El id de la actividad es obligatorio.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar la actividad.', error.message);
  }

  return ok((data as Actividad | null) ?? null);
}

export async function createActividad(
  input: CreateActividadInput
): Promise<ServiceResult<Actividad>> {
  if (!input.parcial_id?.trim()) {
    return fail('El parcial es obligatorio para crear la actividad.');
  }

  const validationNombre = validateNombre(input.nombre);
  if (validationNombre) {
    return fail(validationNombre);
  }

  const validationTipo = validateTipo(input.tipo);
  if (validationTipo) {
    return fail(validationTipo);
  }

  const validationPeso = validatePeso(input.peso_porcentaje);
  if (validationPeso) {
    return fail(validationPeso);
  }

  const payload = {
    parcial_id: input.parcial_id,
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    peso_porcentaje: input.peso_porcentaje,
    fecha_asignada: normalizeFecha(input.fecha_asignada),
  };

  const { data, error } = await supabase
    .from('actividades')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo crear la actividad.', error.message);
  }

  return ok(data as Actividad);
}

export async function updateActividad(
  id: string,
  input: UpdateActividadInput
): Promise<ServiceResult<Actividad>> {
  if (!id?.trim()) {
    return fail('El id de la actividad es obligatorio.');
  }

  const updates: UpdateActividadInput = {};

  if (input.nombre !== undefined) {
    const validationNombre = validateNombre(input.nombre);
    if (validationNombre) {
      return fail(validationNombre);
    }
    updates.nombre = input.nombre.trim();
  }

  if (input.tipo !== undefined) {
    const validationTipo = validateTipo(input.tipo);
    if (validationTipo) {
      return fail(validationTipo);
    }
    updates.tipo = input.tipo;
  }

  if (input.peso_porcentaje !== undefined) {
    const validationPeso = validatePeso(input.peso_porcentaje);
    if (validationPeso) {
      return fail(validationPeso);
    }
    updates.peso_porcentaje = input.peso_porcentaje;
  }

  if (input.fecha_asignada !== undefined) {
    updates.fecha_asignada = normalizeFecha(input.fecha_asignada);
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en la actividad.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo actualizar la actividad.', error.message);
  }

  return ok(data as Actividad);
}

export async function deleteActividad(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id de la actividad es obligatorio.');
  }

  const { error } = await supabase.from('actividades').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar la actividad.', error.message);
  }

  return ok({ id });
}
