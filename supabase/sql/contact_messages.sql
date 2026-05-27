-- =====================================================================
-- TABLA: contact_messages
-- ---------------------------------------------------------------------
-- Almacena los mensajes enviados desde el formulario "Hablemos" de la
-- landing. El frontend hace INSERT directo via REST con la anon key,
-- protegido por una policy RLS que SOLO permite INSERT (no SELECT).
--
-- Para consultar los mensajes: usar el Table Editor del dashboard de
-- Supabase (que se autentica con service_role y se salta RLS).
--
-- Ejecutar este script una vez en: Supabase Dashboard → SQL Editor
-- =====================================================================

create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nombre       text not null,
  email        text not null,
  empresa      text,
  tipo         text not null,
  mensaje      text not null,
  ip           inet,
  user_agent   text,
  leido        boolean not null default false,
  notas        text
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index if not exists contact_messages_email_idx
  on public.contact_messages (email);

-- ---- RLS ----
alter table public.contact_messages enable row level security;

-- Policy: cualquiera (anon o authenticated) puede INSERT.
-- No hay policy de SELECT/UPDATE/DELETE → nadie puede leer/modificar
-- desde el frontend. El dashboard usa service_role y se salta RLS.
drop policy if exists "anyone can insert contact_messages" on public.contact_messages;
create policy "anyone can insert contact_messages"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    length(nombre)  between 1 and 200
    and length(email)   between 3 and 200
    and length(mensaje) between 1 and 5000
    and length(tipo)    between 1 and 100
  );
