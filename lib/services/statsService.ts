import { supabase } from '@/lib/supabase';
import { ServiceResult, fail, ok } from './_result';

export type CarreraStats = {
  anios: number;
  asignaturas: number;
  grupos: number;
  estudiantes: number;
};

export type AnioStats = {
  asignaturas: number;
  grupos: number;
  estudiantes: number;
};

export type AsignaturaStats = {
  grupos: number;
  estudiantes: number;
};

export type GrupoStats = {
  estudiantes: number;
};

type CarreraStatsRow = {
  carrera_id: string;
  anios_count: number;
  asignaturas_count: number;
  grupos_count: number;
  estudiantes_count: number;
};

type AnioStatsRow = {
  anio_id: string;
  asignaturas_count: number;
  grupos_count: number;
  estudiantes_count: number;
};

type AsignaturaStatsRow = {
  asignatura_id: string;
  grupos_count: number;
  estudiantes_count: number;
};

type GrupoStatsRow = {
  grupo_id: string;
  estudiantes_count: number;
};

function makeRecord<T>(ids: string[], factory: () => T): Record<string, T> {
  return ids.reduce<Record<string, T>>((acc, id) => {
    acc[id] = factory();
    return acc;
  }, {});
}

export async function getCarrerasStatsByIds(
  carreraIds: string[]
): Promise<ServiceResult<Record<string, CarreraStats>>> {
  const ids = carreraIds.filter((id) => !!id?.trim());
  if (ids.length === 0) {
    return ok({});
  }

  const { data, error } = await supabase.rpc('get_carreras_stats', {
    carrera_ids: ids,
  });

  if (error) {
    return fail('No se pudo cargar la información de las carreras.', error.message);
  }

  const stats = makeRecord(ids, () => ({ anios: 0, asignaturas: 0, grupos: 0, estudiantes: 0 }));
  ((data as CarreraStatsRow[]) ?? []).forEach((row) => {
    stats[row.carrera_id] = {
      anios: row.anios_count ?? 0,
      asignaturas: row.asignaturas_count ?? 0,
      grupos: row.grupos_count ?? 0,
      estudiantes: row.estudiantes_count ?? 0,
    };
  });

  return ok(stats);
}

export async function getAniosStatsByIds(
  anioIds: string[]
): Promise<ServiceResult<Record<string, AnioStats>>> {
  const ids = anioIds.filter((id) => !!id?.trim());
  if (ids.length === 0) {
    return ok({});
  }

  const { data, error } = await supabase.rpc('get_anios_stats', {
    anio_ids: ids,
  });

  if (error) {
    return fail('No se pudo cargar la información de los años.', error.message);
  }

  const stats = makeRecord(ids, () => ({ asignaturas: 0, grupos: 0, estudiantes: 0 }));
  ((data as AnioStatsRow[]) ?? []).forEach((row) => {
    stats[row.anio_id] = {
      asignaturas: row.asignaturas_count ?? 0,
      grupos: row.grupos_count ?? 0,
      estudiantes: row.estudiantes_count ?? 0,
    };
  });

  return ok(stats);
}

export async function getAsignaturasStatsByIds(
  asignaturaIds: string[]
): Promise<ServiceResult<Record<string, AsignaturaStats>>> {
  const ids = asignaturaIds.filter((id) => !!id?.trim());
  if (ids.length === 0) {
    return ok({});
  }

  const { data, error } = await supabase.rpc('get_asignaturas_stats', {
    asignatura_ids: ids,
  });

  if (error) {
    return fail('No se pudo cargar la información de las asignaturas.', error.message);
  }

  const stats = makeRecord(ids, () => ({ grupos: 0, estudiantes: 0 }));
  ((data as AsignaturaStatsRow[]) ?? []).forEach((row) => {
    stats[row.asignatura_id] = {
      grupos: row.grupos_count ?? 0,
      estudiantes: row.estudiantes_count ?? 0,
    };
  });

  return ok(stats);
}

export async function getGruposStatsByIds(
  grupoIds: string[]
): Promise<ServiceResult<Record<string, GrupoStats>>> {
  const ids = grupoIds.filter((id) => !!id?.trim());
  if (ids.length === 0) {
    return ok({});
  }

  const { data, error } = await supabase.rpc('get_grupos_stats', {
    grupo_ids: ids,
  });

  if (error) {
    return fail('No se pudo cargar la información de los grupos.', error.message);
  }

  const stats = makeRecord(ids, () => ({ estudiantes: 0 }));
  ((data as GrupoStatsRow[]) ?? []).forEach((row) => {
    stats[row.grupo_id] = {
      estudiantes: row.estudiantes_count ?? 0,
    };
  });

  return ok(stats);
}
