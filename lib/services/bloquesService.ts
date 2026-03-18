import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Bloque = {
  id: string;
  parcial_id: string;
  nombre: string;
  peso_porcentaje: number;
  created_at: string;
};

export type CreateBloqueInput = {
  parcial_id: string;
  nombre: string;
  peso_porcentaje?: number;
};

export type UpdateBloqueInput = {
  nombre?: string;
  peso_porcentaje?: number;
};

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre del bloque es obligatorio.';
  }
  if (clean.length > 100) {
    return 'El nombre del bloque no puede superar 100 caracteres.';
  }
  return null;
}

function validatePeso(peso?: number): string | null {
  if (peso === undefined) {
    return null;
  }

  if (Number.isNaN(peso)) {
    return 'El peso del bloque debe ser un número válido.';
  }

  if (peso < 0 || peso > 100) {
    return 'El peso del bloque debe estar entre 0 y 100.';
  }

  return null;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function validateParcialBloqueRules(
  parcialId: string,
  nextPeso: number,
  excludeBloqueId?: string
): Promise<ServiceResult<null>> {
  const { data, error } = await supabase
    .from('bloques')
    .select('id, peso_porcentaje')
    .eq('parcial_id', parcialId);

  if (error) {
    return fail('No se pudo validar la configuración de bloques del parcial.', error.message);
  }

  const bloques = (data as Array<{ id: string; peso_porcentaje: number }>) ?? [];
  const filtered = excludeBloqueId
    ? bloques.filter((item) => item.id !== excludeBloqueId)
    : bloques;

  const sumaActual = roundTo2(
    filtered.reduce((acc, item) => acc + Number(item.peso_porcentaje ?? 0), 0)
  );
  const sumaFinal = roundTo2(sumaActual + nextPeso);

  if (sumaFinal > 100) {
    const disponible = roundTo2(Math.max(0, 100 - sumaActual));
    return fail(
      `El peso del bloque supera el límite del parcial. Disponible: ${disponible}. Suma final: ${sumaFinal}.`
    );
  }

  return ok(null);
}

export async function listBloques(): Promise<ServiceResult<Bloque[]>> {
  const { data, error } = await supabase
    .from('bloques')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los bloques.', error.message);
  }

  return ok((data as Bloque[]) ?? []);
}

export async function listBloquesByParcial(
  parcialId: string
): Promise<ServiceResult<Bloque[]>> {
  if (!parcialId?.trim()) {
    return fail('El id del parcial es obligatorio.');
  }

  const { data, error } = await supabase
    .from('bloques')
    .select('*')
    .eq('parcial_id', parcialId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los bloques del parcial.', error.message);
  }

  return ok((data as Bloque[]) ?? []);
}

export async function getBloqueById(id: string): Promise<ServiceResult<Bloque | null>> {
  if (!id?.trim()) {
    return fail('El id del bloque es obligatorio.');
  }

  const { data, error } = await supabase
    .from('bloques')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar el bloque.', error.message);
  }

  return ok((data as Bloque | null) ?? null);
}

export async function createBloque(
  input: CreateBloqueInput
): Promise<ServiceResult<Bloque>> {
  if (!input.parcial_id?.trim()) {
    return fail('El parcial es obligatorio para crear el bloque.');
  }

  const validationNombre = validateNombre(input.nombre);
  if (validationNombre) {
    return fail(validationNombre);
  }

  const validationPeso = validatePeso(input.peso_porcentaje);
  if (validationPeso) {
    return fail(validationPeso);
  }

  const nextPeso = roundTo2(input.peso_porcentaje ?? 0);

  // Validar que el peso no supere el límite del parcial
  const ruleValidation = await validateParcialBloqueRules(input.parcial_id, nextPeso);
  if (!ruleValidation.ok) {
    return ruleValidation;
  }

  const { data, error } = await supabase
    .from('bloques')
    .insert({
      parcial_id: input.parcial_id,
      nombre: input.nombre.trim(),
      peso_porcentaje: nextPeso,
    })
    .select()
    .single();

  if (error) {
    return fail('No se pudo crear el bloque.', error.message);
  }

  return ok(data as Bloque);
}

export async function updateBloque(
  id: string,
  input: UpdateBloqueInput
): Promise<ServiceResult<Bloque>> {
  if (!id?.trim()) {
    return fail('El id del bloque es obligatorio.');
  }

  if (Object.keys(input).length === 0) {
    return fail('Debe proporcionar al menos un campo para actualizar.');
  }

  // Obtener el bloque actual para contextualizar las validaciones
  const currentResult = await getBloqueById(id);
  if (!currentResult.ok || !currentResult.data) {
    return fail('No se encontró el bloque.');
  }

  const current = currentResult.data;

  // Validar campos proporcionados
  if (input.nombre !== undefined) {
    const validationNombre = validateNombre(input.nombre);
    if (validationNombre) {
      return fail(validationNombre);
    }
  }

  if (input.peso_porcentaje !== undefined) {
    const validationPeso = validatePeso(input.peso_porcentaje);
    if (validationPeso) {
      return fail(validationPeso);
    }

    const nextPeso = roundTo2(input.peso_porcentaje);
    const ruleValidation = await validateParcialBloqueRules(
      current.parcial_id,
      nextPeso,
      id
    );
    if (!ruleValidation.ok) {
      return ruleValidation;
    }
  }

  const updateData: Record<string, any> = {};
  if (input.nombre !== undefined) {
    updateData.nombre = input.nombre.trim();
  }
  if (input.peso_porcentaje !== undefined) {
    updateData.peso_porcentaje = roundTo2(input.peso_porcentaje);
  }

  const { data, error } = await supabase
    .from('bloques')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return fail('No se pudo actualizar el bloque.', error.message);
  }

  return ok(data as Bloque);
}

export async function deleteBloque(id: string): Promise<ServiceResult<null>> {
  if (!id?.trim()) {
    return fail('El id del bloque es obligatorio.');
  }

  const { error } = await supabase
    .from('bloques')
    .delete()
    .eq('id', id);

  if (error) {
    return fail('No se pudo eliminar el bloque.', error.message);
  }

  return ok(null);
}
