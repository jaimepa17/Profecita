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

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function validatePuntaje(puntaje: number, maxPermitido: number): string | null {
  if (Number.isNaN(puntaje)) {
    return 'El puntaje debe ser un número válido.';
  }

  if (puntaje < 0 || puntaje > maxPermitido) {
    return `El puntaje debe estar entre 0 y ${maxPermitido}.`;
  }

  return null;
}

async function getActividadMaxPuntaje(actividadId: string): Promise<ServiceResult<number>> {
  const { data, error } = await supabase
    .from('actividades')
    .select('peso_porcentaje, puntaje_maximo')
    .eq('id', actividadId)
    .maybeSingle();

  if (error) {
    return fail('No se pudo validar la actividad para registrar la nota.', error.message);
  }

  if (!data) {
    return fail('La actividad seleccionada no existe.');
  }

  const peso = Number((data as { peso_porcentaje?: number }).peso_porcentaje ?? 0);
  const puntajeMaximo = Number((data as { puntaje_maximo?: number }).puntaje_maximo ?? 0);

  // Regla de negocio actual: la nota se limita por el valor configurado de la actividad.
  const maxPermitido = roundTo2(peso > 0 ? peso : puntajeMaximo > 0 ? puntajeMaximo : 100);
  return ok(maxPermitido);
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
    .select('id, actividad_id, estudiante_id, puntaje_obtenido, observaciones, created_at')
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
    .select('id, actividad_id, estudiante_id, puntaje_obtenido, observaciones, created_at')
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
    .select('id, actividad_id, estudiante_id, puntaje_obtenido, observaciones, created_at')
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
    .select('id, actividad_id, estudiante_id, puntaje_obtenido, observaciones, created_at')
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

  if (input.puntaje_obtenido === undefined) {
    return fail('El puntaje es obligatorio.');
  }

  const maxPermitidoResult = await getActividadMaxPuntaje(input.actividad_id);
  if (!maxPermitidoResult.ok) {
    return maxPermitidoResult;
  }

  const validationPuntaje = validatePuntaje(input.puntaje_obtenido, maxPermitidoResult.data);
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
    .select('id, actividad_id, estudiante_id, puntaje_obtenido, observaciones, created_at')
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
    const currentNotaResult = await getNotaById(id);
    if (!currentNotaResult.ok) {
      return currentNotaResult;
    }

    if (!currentNotaResult.data) {
      return fail('La nota que intentas actualizar no existe.');
    }

    const maxPermitidoResult = await getActividadMaxPuntaje(currentNotaResult.data.actividad_id);
    if (!maxPermitidoResult.ok) {
      return maxPermitidoResult;
    }

    const validationPuntaje = validatePuntaje(input.puntaje_obtenido, maxPermitidoResult.data);
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
    .select('id, actividad_id, estudiante_id, puntaje_obtenido, observaciones, created_at')
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

  const { data, error } = await supabase
    .from('notas')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return fail('No se pudo eliminar la nota.', error.message);
  }

  if (!data) {
    return fail('No se pudo eliminar la nota. Verifica permisos o si ya fue eliminada.');
  }

  return ok({ id });
}
