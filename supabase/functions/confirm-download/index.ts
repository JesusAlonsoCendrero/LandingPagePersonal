/* =====================================================================
   EDGE FUNCTION: confirm-download
   ---------------------------------------------------------------------
   Recibe el token desde la página de confirmación.
   1) Valida que el token exista y no esté caducado (7 días).
   2) Marca la solicitud como confirmada.
   3) Genera una signed URL del archivo en Storage (1h de validez).
   4) Devuelve la URL al frontend para disparar la descarga.
   ===================================================================== */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Tiempo de validez del token de confirmación (en días)
const TOKEN_TTL_DAYS = 7;
// Tiempo de validez del signed URL (en segundos)
const SIGNED_URL_TTL = 60 * 60; // 1 hora

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405, req });
  }

  let payload: { token?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, { status: 400, req });
  }

  const token = (payload.token ?? '').trim();
  if (!token || token.length < 32) {
    return jsonResponse({ error: 'Token inválido.' }, { status: 400, req });
  }

  // ---- Buscar solicitud ----
  const { data: descarga, error: errSel } = await supabase
    .from('descargas')
    .select('id, recurso_slug, email, created_at, confirmado, num_descargas')
    .eq('token_confirmacion', token)
    .maybeSingle();

  if (errSel) {
    console.error('[descargas select]', errSel);
    return jsonResponse({ error: 'Error de servidor.' }, { status: 500, req });
  }
  if (!descarga) {
    return jsonResponse({ error: 'Token no encontrado.' }, { status: 404, req });
  }

  // ---- Token caducado ----
  const createdAt = new Date(descarga.created_at).getTime();
  const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  if (ageDays > TOKEN_TTL_DAYS) {
    return jsonResponse(
      { error: 'Este enlace ha caducado. Vuelve a solicitar la descarga.' },
      { status: 410, req }
    );
  }

  // ---- Recurso ----
  const { data: recurso, error: errRec } = await supabase
    .from('recursos')
    .select('slug, nombre, storage_path, activo')
    .eq('slug', descarga.recurso_slug)
    .maybeSingle();

  if (errRec || !recurso) {
    return jsonResponse({ error: 'Recurso no disponible.' }, { status: 404, req });
  }
  if (!recurso.activo) {
    return jsonResponse({ error: 'Este recurso ya no está disponible.' }, { status: 410, req });
  }

  // ---- Signed URL ----
  const { data: signed, error: errSign } = await supabase
    .storage
    .from('recursos')
    .createSignedUrl(recurso.storage_path, SIGNED_URL_TTL, {
      download: recurso.storage_path.split('/').pop() ?? true,
    });

  if (errSign || !signed) {
    console.error('[storage sign]', errSign);
    return jsonResponse({ error: 'No se pudo generar el enlace de descarga.' }, { status: 500, req });
  }

  // ---- Marcar confirmado + incrementar contador ----
  const now = new Date().toISOString();
  const { error: errUpd } = await supabase
    .from('descargas')
    .update({
      confirmado: true,
      fecha_confirmacion: descarga.confirmado ? undefined : now,
      fecha_descarga: now,
      num_descargas: descarga.num_descargas + 1,
    })
    .eq('id', descarga.id);

  if (errUpd) console.error('[descargas update]', errUpd);

  return jsonResponse({
    ok: true,
    nombre_recurso: recurso.nombre,
    download_url: signed.signedUrl,
    expires_in_seconds: SIGNED_URL_TTL,
  }, { req });
});
