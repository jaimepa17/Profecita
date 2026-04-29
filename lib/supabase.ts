import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXTERNAL_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXTERNAL_SUPABASE_ANON_KEY || '';

const MAX_RETRIES = 2;
const TIMEOUT_MS = 15_000;

/**
 * Custom fetch wrapper with timeout + retry on network errors.
 * Supabase calls this for every request.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on network errors, not on HTTP errors (4xx/5xx are caught later)
      if (lastError.name === 'AbortError') {
        console.warn(`[Supabase] Request timed out (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
      } else {
        console.warn(`[Supabase] Network error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, lastError.message);
      }

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1000ms
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithRetry,
  },
});