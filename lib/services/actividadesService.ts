import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Actividad = {
  id: string;
  bloque_id: string;
  nombre: string;
  tipo: 'corte' | 'examen';
  puntaje_maximo: number;
  peso_porcentaje: number;
  fecha_asignada?: string | null;
  created_at: string;
};

export type CreateActividadInput = {
  bloque_id: string;
  nombre: string;
  tipo: 'corte' | 'examen';
  puntaje_maximo?: number;
  peso_porcentaje: number;
  fecha_asignada?: string | null;
};

export type UpdateActividadInput = {
  nombre?: string;
  tipo?: 'corte' | 'examen';
  puntaje_maximo?: number;
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

  if (peso <= 0 || peso > 100) {
    return 'El peso de la actividad debe ser mayor a 0 y menor o igual a 100.';
  }

  return null;
}

function validatePuntajeMaximo(puntaje?: number): string | null {
  if (puntaje === undefined) {
    return null;
  }

  if (Number.isNaN(puntaje)) {
    return 'El puntaje máximo debe ser un número válido.';
  }

  if (puntaje <= 0) {
    return 'El puntaje máximo debe ser mayor a 0.';
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

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function validateBloqueActivityRules(
  bloqueId: string,
  _nextTipo: 'corte' | 'examen',
  nextPeso: number,
  excludeActividadId?: string
): Promise<ServiceResult<null>> {
  const { data, error } = await supabase
    .from('actividades')
    .select('id, tipo, peso_porcentaje')
    .eq('bloque_id', bloqueId);

  if (error) {
    return fail('No se pudo validar la configuración del bloque.', error.message);
  }

  const actividades = (data as Array<{ id: string; tipo: 'corte' | 'examen'; peso_porcentaje: number }>) ?? [];
  const filtered = excludeActividadId
    ? actividades.filter((item) => item.id !== excludeActividadId)
    : actividades;

  const sumaActual = roundTo2(
    filtered.reduce((acc, item) => acc + Number(item.peso_porcentaje ?? 0), 0)
  );
  const sumaFinal = roundTo2(sumaActual + nextPeso);

  if (sumaFinal > 100) {
    const disponible = roundTo2(Math.max(0, 100 - sumaActual));
    return fail(
      `El peso supera el límite del bloque. Disponible: ${disponible}. Suma final: ${sumaFinal}.`
    );
  }

  return ok(null);
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

export async function listActividadesByBloque(
  bloqueId: string
): Promise<ServiceResult<Actividad[]>> {
  if (!bloqueId?.trim()) {
    return fail('El id del bloque es obligatorio.');
  }

  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('bloque_id', bloqueId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar las actividades del bloque.', error.message);
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
  if (!input.bloque_id?.trim()) {
    return fail('El bloque es obligatorio para crear la actividad.');
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

  const validationPuntaje = validatePuntajeMaximo(input.puntaje_maximo);
  if (validationPuntaje) {
    return fail(validationPuntaje);
  }

  const reglas = await validateBloqueActivityRules(
    input.bloque_id,
    input.tipo,
    input.peso_porcentaje
  );
  if (!reglas.ok) {
    return reglas;
  }

  const payload = {
    bloque_id: input.bloque_id,
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    puntaje_maximo: input.puntaje_maximo ?? 100,
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

  const currentResult = await getActividadById(id);
  if (!currentResult.ok) {
    return fail('No se pudo validar la actividad actual.', currentResult.error);
  }

  if (!currentResult.data) {
    return fail('La actividad que intentas actualizar no existe.');
  }

  const current = currentResult.data;
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

  if (input.puntaje_maximo !== undefined) {
    const validationPuntaje = validatePuntajeMaximo(input.puntaje_maximo);
    if (validationPuntaje) {
      return fail(validationPuntaje);
    }
    updates.puntaje_maximo = input.puntaje_maximo;
  }

  if (input.fecha_asignada !== undefined) {
    updates.fecha_asignada = normalizeFecha(input.fecha_asignada);
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en la actividad.');
  }

  const nextTipo = updates.tipo ?? current.tipo;
  const nextPeso = updates.peso_porcentaje ?? current.peso_porcentaje;
  const reglas = await validateBloqueActivityRules(
    current.bloque_id,
    nextTipo,
    nextPeso,
    current.id
  );
  if (!reglas.ok) {
    return reglas;
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
