/**
 * DataPrefetchService
 *
 * Mantiene un cache en memoria de datos core (carreras, anios, asignaturas, grupos, stats).
 * Se inicializa una vez cuando la autenticación está lista y precarga los datos en background.
 *
 * Las pantallas leen del cache al montar → render instantáneo, sin skeletons/loaders.
 * useRealtimeCollection se encarga de las actualizaciones en vivo mientras la pantalla está activa.
 *
 * Flujo:
 *   1. App monta → auth listo → initDataPrefetch(userId)
 *   2. Prefetch carga carreras + stats, anios + stats para todas las carreras
 *   3. Home monta → useState(() => getCached('carreras')) → render inmediato
 *   4. useRealtimeCollection mantiene datos frescos mientras la pantalla está activa
 */

import { listCarreras } from './carrerasService';
import { listAniosByCarrera } from './aniosService';
import { getCarrerasStatsByIds, getAniosStatsByIds } from './statsService';
import { listEstudiantesByProfesor } from './estudiantesService';

// ─── Cache Keys ───────────────────────────────────────────────

export const PrefetchKeys = {
  CARRERAS: 'carreras',
  CARRERAS_STATS: 'carreras_stats',
  ANIOS_PREFIX: 'anios:',
  ANIOS_STATS_PREFIX: 'anios_stats:',
  ESTUDIANTES_IDS: 'estudiantes_ids',
} as const;

export function getPrefetchKeyAnios(carreraId: string): string {
  return `${PrefetchKeys.ANIOS_PREFIX}${carreraId}`;
}

export function getPrefetchKeyAniosStats(carreraId: string): string {
  return `${PrefetchKeys.ANIOS_STATS_PREFIX}${carreraId}`;
}

// ─── In-Memory Store ─────────────────────────────────────────

const _store = new Map<string, unknown>();

/** Obtiene datos del cache de prefetch. Returns undefined si no hay cache. */
export function getCached<T>(key: string): T | undefined {
  return _store.get(key) as T | undefined;
}

/** Verifica si una key existe en cache. */
export function hasCache(key: string): boolean {
  return _store.has(key);
}

function _setCache(key: string, value: unknown): void {
  _store.set(key, value);
}

/** Guarda datos en el cache global. Útil para que las pantallas populateen el cache para visitas subsecuentes. */
export function setCache<T>(key: string, value: T): void {
  _store.set(key, value);
}

function _clearCache(): void {
  _store.clear();
}

// ─── Initialization ──────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

/**
 * Inicializa el DataPrefetchService.
 * Debe llamarse UNA SOLA VEZ cuando el auth está listo (desde App.tsx o RootNavigator).
 *
 * - Precarga carreras + stats (para Home)
 * - Precarga anios + stats para cada carrera (para Anios)
 * - Precarga IDs de estudiantes (para cómputo de stats en Home)
 */
export function initDataPrefetch(userId: string): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      // ── Nivel 1: Carreras + Stats ──
      const carrerasRes = await listCarreras();
      if (!carrerasRes.ok) {
        console.warn('[Prefetch] Error cargando carreras:', carrerasRes.error);
        return;
      }
      const carreras = carrerasRes.data;
      _setCache(PrefetchKeys.CARRERAS, carreras);

      if (carreras.length > 0) {
        const statsRes = await getCarrerasStatsByIds(carreras.map((c) => c.id));
        if (statsRes.ok) {
          _setCache(PrefetchKeys.CARRERAS_STATS, statsRes.data);
        }

        // ── Nivel 2: Anios + Stats para cada carrera ──
        const aniosPromises = carreras.map(async (carrera) => {
          const aniosRes = await listAniosByCarrera(carrera.id);
          if (aniosRes.ok && aniosRes.data.length > 0) {
            _setCache(getPrefetchKeyAnios(carrera.id), aniosRes.data);
            const aniosStatsRes = await getAniosStatsByIds(
              aniosRes.data.map((a) => a.id),
            );
            if (aniosStatsRes.ok) {
              _setCache(getPrefetchKeyAniosStats(carrera.id), aniosStatsRes.data);
            }
          }
        });

        await Promise.all(aniosPromises);
      }

      // ── Nivel 1b: IDs de estudiantes (para estatales en Home) ──
      const estudiantesRes = await listEstudiantesByProfesor(userId);
      if (estudiantesRes.ok) {
        _setCache(
          PrefetchKeys.ESTUDIANTES_IDS,
          estudiantesRes.data.map((e) => e.id),
        );
      }
    } catch (e) {
      console.warn('[Prefetch] Init error:', e);
    }
  })();

  return _initPromise;
}

/** Reinicia el cache. Útil para logout. */
export function resetDataPrefetch(): void {
  _initPromise = null;
  _clearCache();
}
