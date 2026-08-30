/* =====================================================================
   EDGE FUNCTION: registrar-descarga
   ---------------------------------------------------------------------
   Variante de `request-download` para descargas DIRECTAS (sin doble
   opt-in por email). Su único trabajo es CAPTURAR EL LEAD:

   1) Valida payload (email + empresa + consent + slug existente y activo).
   2) Inserta fila en `descargas` (queda registrado el lead + consentimiento).
   3) Inserta/actualiza el email en `optin_comercial` (base de clientes).

   NO envía email y NO requiere que el fichero esté en Storage: el archivo
   (un .txt) se sirve directamente desde el sitio y el frontend dispara la
   descarga en cuanto esta función responde OK.

   Variables de entorno (Supabase → Settings → Edge Functions):
     SUPABASE_URL              (autodefinida)
     SUPABASE_SERVICE_ROLE_KEY (autodefinida)
   ===================================================================== */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

interface Payload {
  recurso_slug: string;
  email: string;
  nombre?: string;
  empresa: string;
  consent_comercial: boolean;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405, req });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, { status: 400, req });
  }

  // ---- Validación ----
  const email   = (payload.email ?? '').trim().toLowerCase();
  const slug    = (payload.recurso_slug ?? '').trim();
  const nombre  = (payload.nombre ?? '').trim() || null;
  const empresa = (payload.empresa ?? '').trim();
  const consent = payload.consent_comercial === true;

  if (!slug || !email || !empresa || !consent) {
    return jsonResponse(
      { error: 'Faltan campos obligatorios (email, empresa, recurso_slug, consent_comercial).' },
      { status: 400, req }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Email no válido.' }, { status: 400, req });
  }
  if (empresa.length > 200) {
    return jsonResponse({ error: 'Empresa demasiado larga (máx. 200 caracteres).' }, { status: 400, req });
  }

  // ---- Recurso existe y está activo ----
  const { data: recurso, error: errRec } = await supabase
    .from('recursos')
    .select('slug, nombre')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle();

  if (errRec) {
    console.error('[recursos]', errRec);
    return jsonResponse({ error: 'Error consultando recurso.' }, { status: 500, req });
  }
  if (!recurso) {
    return jsonResponse({ error: 'Recurso no encontrado.' }, { status: 404, req });
  }

  // ---- Metadatos del cliente ----
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
  const ua = req.headers.get('user-agent') || null;

  // Token generado por compatibilidad con el esquema de `descargas`
  // (la columna existe para el flujo de doble opt-in). Aquí no se usa.
  const token = crypto.randomUUID().replace(/-/g, '') +
                crypto.randomUUID().replace(/-/g, '');

  // ---- Insertar descarga (registro del lead) ----
  const { error: errIns } = await supabase.from('descargas').insert({
    recurso_slug:       slug,
    email,
    nombre,
    empresa,
    consent_comercial:  consent,
    consent_ip:         ip,
    consent_user_agent: ua,
    token_confirmacion: token,
  });

  if (errIns) {
    console.error('[descargas insert]', errIns);
    return jsonResponse({ error: 'No se pudo registrar la solicitud.' }, { status: 500, req });
  }

  // ---- Upsert en optin_comercial (base de clientes) ----
  const { error: errOpt } = await supabase.from('optin_comercial').upsert({
    email,
    consentido:    true,
    origen:        `descarga:${slug}`,
    consentido_en: new Date().toISOString(),
    baja_en:       null,
    ip,
    user_agent:    ua,
  }, { onConflict: 'email' });

  if (errOpt) console.error('[optin_comercial upsert]', errOpt);

  return jsonResponse({ ok: true }, { req });
});
