import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Nota = {
  id: string;
  actividad_id: string;
  estudiante_id: string;
  puntaje_obtenido: number;
  observaciones?: string | null;
  created_at: string;
};

export type CreateNotaInput = {
  actividad_id: string;
  estudiante_id: string;
  puntaje_obtenido: number;
  observaciones?: string | null;
};

export type UpdateNotaInput = {
  puntaje_obtenido?: number;
  observaciones?: string | null;
};

function validatePuntaje(puntaje?: number): string | null {
  if (puntaje === undefined) {
    return 'El puntaje es obligatorio.';
  }

  if (Number.isNaN(puntaje)) {
    return 'El puntaje debe ser un número válido.';
  }

  if (puntaje < 0 || puntaje > 100) {
    return 'El puntaje debe estar entre 0 y 100.';
  }

  return null;
}

function normalizeObservaciones(observaciones?: string | null): string | null {
  const clean = observaciones?.trim();
  if (!clean) {
    return null;
  }
  return clean;
}

export async function listNotas(): Promise<ServiceResult<Nota[]>> {
  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las notas.', error.message);
  }

  return ok((data as Nota[]) ?? []);
}

export async function listNotasByActividad(
  actividadId: string
): Promise<ServiceResult<Nota[]>> {
  if (!actividadId?.trim()) {
    return fail('El id de la actividad es obligatorio.');
  }

  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('actividad_id', actividadId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las notas de la actividad.', error.message);
  }

  return ok((data as Nota[]) ?? []);
}

export async function listNotasByEstudiante(
  estudianteId: string
): Promise<ServiceResult<Nota[]>> {
  if (!estudianteId?.trim()) {
    return fail('El id del estudiante es obligatorio.');
  }

  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('estudiante_id', estudianteId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las notas del estudiante.', error.message);
  }

  return ok((data as Nota[]) ?? []);
}

export async function getNotaById(id: string): Promise<ServiceResult<Nota | null>> {
  if (!id?.trim()) {
    return fail('El id de la nota es obligatorio.');
  }

  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar la nota.', error.message);
  }

  return ok((data as Nota | null) ?? null);
}

export async function createNota(input: CreateNotaInput): Promise<ServiceResult<Nota>> {
  if (!input.actividad_id?.trim() || !input.estudiante_id?.trim()) {
    return fail('Actividad y estudiante son obligatorios para registrar la nota.');
  }

  const validationPuntaje = validatePuntaje(input.puntaje_obtenido);
  if (validationPuntaje) {
    return fail(validationPuntaje);
  }

  const payload = {
    actividad_id: input.actividad_id,
    estudiante_id: input.estudiante_id,
    puntaje_obtenido: input.puntaje_obtenido,
    observaciones: normalizeObservaciones(input.observaciones),
  };

  const { data, error } = await supabase
    .from('notas')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    const isDuplicate =
      error.code === '23505' ||
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique');

    if (isDuplicate) {
      return fail(
        'Ya existe una nota para este estudiante en la actividad seleccionada.',
        error.message
      );
    }

    return fail('No se pudo crear la nota.', error.message);
  }

  return ok(data as Nota);
}

export async function updateNota(
  id: string,
  input: UpdateNotaInput
): Promise<ServiceResult<Nota>> {
  if (!id?.trim()) {
    return fail('El id de la nota es obligatorio.');
  }

  const updates: UpdateNotaInput = {};

  if (input.puntaje_obtenido !== undefined) {
    const validationPuntaje = validatePuntaje(input.puntaje_obtenido);
    if (validationPuntaje) {
      return fail(validationPuntaje);
    }
    updates.puntaje_obtenido = input.puntaje_obtenido;
  }

  if (input.observaciones !== undefined) {
    updates.observaciones = normalizeObservaciones(input.observaciones);
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en la nota.');
  }

  const { data, error } = await supabase
    .from('notas')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo actualizar la nota.', error.message);
  }

  return ok(data as Nota);
}

export async function deleteNota(id: string): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id de la nota es obligatorio.');
  }

  const { error } = await supabase.from('notas').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar la nota.', error.message);
  }

  return ok({ id });
}
