-- =====================================================================
-- MIGRATION: añade la columna `empresa` a la tabla `descargas`
-- ---------------------------------------------------------------------
-- Se añade como nullable para no romper filas existentes (las que se
-- crearon antes de esta migración tendrán empresa = NULL). La obligatoriedad
-- se enforce en la Edge Function `request-download` para los nuevos envíos.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================================

alter table public.descargas
  add column if not exists empresa text;

-- Índice opcional para poder filtrar/agrupar leads por empresa en el futuro.
create index if not exists descargas_empresa_idx
  on public.descargas (empresa)
  where empresa is not null;
