/* ===================================
   SUPABASE — Configuración pública
   ---------------------------------------------------------------------
   Estas dos claves son SEGURAS para exponer en el frontend:
     - SUPABASE_URL: la URL pública de tu proyecto
     - SUPABASE_ANON_KEY: la clave anon (solo puede llamar a Edge
       Functions y leer tablas con RLS pública)

   NUNCA pongas aquí el service_role key (ese solo va en variables
   de entorno de las Edge Functions, en el servidor).

   Cómo obtenerlas:
     Supabase Dashboard → Settings → API
   =================================== */

window.SUPABASE_CONFIG = {
  url:     'https://yrehhqzteiqwnejedwrg.supabase.co',
  anonKey: 'sb_publishable_Coy7bynvd8yW9mWAOpo1uQ_pA7YR6eZ',
};
