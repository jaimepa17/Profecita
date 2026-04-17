import { supabase } from '@/lib/supabase';
import { fail, ServiceResult } from './_result';

export async function getCurrentUserId(): Promise<ServiceResult<string>> {
  // Prefer current session first (local) to avoid an extra network roundtrip on every service call.
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user?.id;
  if (sessionUserId) {
    return { ok: true, data: sessionUserId };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return fail('No se pudo validar la sesión actual.', error.message);
  }

  const userId = data.user?.id;
  if (!userId) {
    return fail('Debes iniciar sesión para continuar.');
  }

  return { ok: true, data: userId };
}
