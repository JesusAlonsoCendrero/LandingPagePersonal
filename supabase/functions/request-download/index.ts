/* =====================================================================
   EDGE FUNCTION: request-download
   ---------------------------------------------------------------------
   Recibe la solicitud del formulario de descarga.
   1) Valida payload (email + consent + slug existente y activo).
   2) Inserta fila en `descargas` con un token único.
   3) Inserta/actualiza email en `optin_comercial`.
   4) Envía email de confirmación via Resend con el link de descarga.

   Variables de entorno necesarias (Supabase → Settings → Edge Functions):
     SUPABASE_URL              (autodefinida)
     SUPABASE_SERVICE_ROLE_KEY (autodefinida)
     RESEND_API_KEY            (de https://resend.com)
     FROM_EMAIL                e.g. 'descargas@tudominio.com'
                               (o 'onboarding@resend.dev' sin dominio verificado)
     SITE_URL                  e.g. 'https://jesusalonsocendrero.web.app'
   ===================================================================== */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

interface Payload {
  recurso_slug: string;
  email: string;
  nombre?: string;
  consent_comercial: boolean;
}

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL    = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev';
const SITE_URL      = Deno.env.get('SITE_URL') ?? 'http://localhost:5500';

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
  const email = (payload.email ?? '').trim().toLowerCase();
  const slug  = (payload.recurso_slug ?? '').trim();
  const nombre = (payload.nombre ?? '').trim() || null;
  const consent = payload.consent_comercial === true;

  if (!slug || !email || !consent) {
    return jsonResponse(
      { error: 'Faltan campos obligatorios (email, recurso_slug, consent_comercial).' },
      { status: 400, req }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Email no válido.' }, { status: 400, req });
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

  // ---- Token único ----
  const token = crypto.randomUUID().replace(/-/g, '') +
                crypto.randomUUID().replace(/-/g, '');

  // ---- Metadatos del cliente ----
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
  const ua = req.headers.get('user-agent') || null;

  // ---- Insertar descarga ----
  const { error: errIns } = await supabase.from('descargas').insert({
    recurso_slug:        slug,
    email,
    nombre,
    consent_comercial:   consent,
    consent_ip:          ip,
    consent_user_agent:  ua,
    token_confirmacion:  token,
  });

  if (errIns) {
    console.error('[descargas insert]', errIns);
    return jsonResponse({ error: 'No se pudo registrar la solicitud.' }, { status: 500, req });
  }

  // ---- Upsert en optin_comercial ----
  const { error: errOpt } = await supabase.from('optin_comercial').upsert({
    email,
    consentido:   true,
    origen:       `descarga:${slug}`,
    consentido_en: new Date().toISOString(),
    baja_en:      null,
    ip,
    user_agent:   ua,
  }, { onConflict: 'email' });

  if (errOpt) console.error('[optin_comercial upsert]', errOpt);

  // ---- Email de confirmación ----
  const confirmUrl = `${SITE_URL}/pages/descargas/confirmar.html?token=${token}`;
  const greeting = nombre ? `Hola ${nombre},` : 'Hola,';

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0d1220;color:#f0f4f8;border-radius:16px;">
      <h1 style="font-size:22px;margin:0 0 16px 0;color:#fff;">${greeting}</h1>
      <p style="font-size:15px;line-height:1.6;color:#c5cdd6;margin:0 0 20px 0;">
        Gracias por solicitar la descarga de <strong style="color:#fff;">${escapeHtml(recurso.nombre)}</strong>.
      </p>
      <p style="font-size:15px;line-height:1.6;color:#c5cdd6;margin:0 0 28px 0;">
        Confirma tu email haciendo clic en el botón para acceder a la descarga:
      </p>
      <p style="margin:0 0 28px 0;">
        <a href="${confirmUrl}"
           style="display:inline-block;padding:14px 28px;background:#0078d4;color:#fff;text-decoration:none;border-radius:100px;font-weight:600;font-size:15px;">
          Confirmar y descargar
        </a>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#6b7f99;margin:0 0 12px 0;">
        Si el botón no funciona, copia esta URL en tu navegador:<br/>
        <a href="${confirmUrl}" style="color:#00b4d8;word-break:break-all;">${confirmUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #2a3447;margin:32px 0;"/>
      <p style="font-size:12px;color:#6b7f99;margin:0;line-height:1.5;">
        Recibes este email porque has solicitado una descarga en jesusalonso.dev.
        Si no has sido tú, ignora este mensaje.
      </p>
    </div>
  `;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    `Jesús Alonso <${FROM_EMAIL}>`,
      to:      [email],
      subject: `Confirma la descarga: ${recurso.nombre}`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    console.error('[resend]', emailRes.status, errText);
    return jsonResponse(
      { error: 'No se pudo enviar el email de confirmación.' },
      { status: 502, req }
    );
  }

  return jsonResponse({ ok: true }, { req });
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!));
}
