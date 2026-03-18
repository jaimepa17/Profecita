import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type Grupo = {
  id: string;
  asignatura_id: string;
  nombre: string;
  turno?: string | null;
  created_at: string;
};

export type CreateGrupoInput = {
  asignatura_id: string;
  nombre: string;
  turno?: string | null;
};

export type UpdateGrupoInput = {
  nombre?: string;
  turno?: string | null;
};

function validateNombre(nombre?: string): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return 'El nombre del grupo es obligatorio.';
  }
  if (clean.length > 50) {
    return 'El nombre del grupo no puede superar 50 caracteres.';
  }
  return null;
}

function normalizeTurno(turno?: string | null): string | null {
  const clean = turno?.trim();
  if (!clean) {
    return null;
  }
  return clean.slice(0, 50);
}

export async function listGrupos(): Promise<ServiceResult<Grupo[]>> {
  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los grupos.', error.message);
  }

  return ok((data as Grupo[]) ?? []);
}

export async function listGruposByAsignatura(
  asignaturaId: string
): Promise<ServiceResult<Grupo[]>> {
  if (!asignaturaId?.trim()) {
    return fail('El id de la asignatura es obligatorio.');
  }

  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .eq('asignatura_id', asignaturaId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail('No se pudieron cargar los grupos de la asignatura.', error.message);
  }

  return ok((data as Grupo[]) ?? []);
}

export async function getGrupoById(id: string): Promise<ServiceResult<Grupo | null>> {
  if (!id?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return fail('No se pudo consultar el grupo.', error.message);
  }

  return ok((data as Grupo | null) ?? null);
}

export async function createGrupo(input: CreateGrupoInput): Promise<ServiceResult<Grupo>> {
  if (!input.asignatura_id?.trim()) {
    return fail('La asignatura es obligatoria para crear el grupo.');
  }

  const validation = validateNombre(input.nombre);
  if (validation) {
    return fail(validation);
  }

  const payload = {
    asignatura_id: input.asignatura_id,
    nombre: input.nombre.trim(),
    turno: normalizeTurno(input.turno),
  };

  const { data, error } = await supabase
    .from('grupos')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo crear el grupo.', error.message);
  }

  return ok(data as Grupo);
}

export async function updateGrupo(
  id: string,
  input: UpdateGrupoInput
): Promise<ServiceResult<Grupo>> {
  if (!id?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const updates: UpdateGrupoInput = {};

  if (input.nombre !== undefined) {
    const validation = validateNombre(input.nombre);
    if (validation) {
      return fail(validation);
    }
    updates.nombre = input.nombre.trim();
  }

  if (input.turno !== undefined) {
    updates.turno = normalizeTurno(input.turno);
  }

  if (Object.keys(updates).length === 0) {
    return fail('No hay cambios para actualizar en el grupo.');
  }

  const { data, error } = await supabase
    .from('grupos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return fail('No se pudo actualizar el grupo.', error.message);
  }

  return ok(data as Grupo);
}

export async function deleteGrupo(id: string): Promise<ServiceResult<{ id: string }>> {
  if (!id?.trim()) {
    return fail('El id del grupo es obligatorio.');
  }

  const { error } = await supabase.from('grupos').delete().eq('id', id);
  if (error) {
    return fail('No se pudo eliminar el grupo.', error.message);
  }

  return ok({ id });
}
