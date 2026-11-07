// ============================================================================
// supabaseClient.js - Instância única do cliente Supabase para a aplicação
// ============================================================================

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY } from './config.js';

if (!window.supabase) {
  console.error('Biblioteca Supabase JS não encontrada no window.supabase. Verifique a tag de script CDN no index.html.');
}

// Prefere a chave pública publishable oficial, ou a anon de fallback
// NUNCA utilizar secret_key nem service_role no front-end!
const apiKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY;

export const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, apiKey)
  : null;
