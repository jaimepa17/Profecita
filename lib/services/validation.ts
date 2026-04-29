/**
 * Funciones de validación reutilizables para todos los servicios.
 * Centraliza reglas de negocio compartidas para evitar duplicación.
 */

export function validateNombre(
  nombre?: string,
  campo = 'Nombre',
  maxLength = 100,
): string | null {
  const clean = nombre?.trim();
  if (!clean) {
    return `El ${campo.toLowerCase()} es obligatorio.`;
  }
  if (clean.length > maxLength) {
    return `El ${campo.toLowerCase()} no puede superar ${maxLength} caracteres.`;
  }
  return null;
}

export function validateFecha(
  fecha: string,
  campo = 'Fecha',
): string | null {
  if (!fecha) {
    return `La ${campo.toLowerCase()} es obligatoria.`;
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fecha)) {
    return `La ${campo.toLowerCase()} debe tener formato YYYY-MM-DD.`;
  }
  return null;
}

export function validateRequiredId(
  id?: string,
  campo = 'Id',
): string | null {
  if (!id?.trim()) {
    return `El ${campo.toLowerCase()} es obligatorio.`;
  }
  return null;
}

export function normalizeString(
  value?: string | null,
  maxLength?: number,
): string | null {
  const clean = value?.trim();
  if (!clean) return null;
  return maxLength ? clean.slice(0, maxLength) : clean;
}
