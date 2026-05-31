-- =====================================================================
-- INSERT: nuevo recurso "Dashboard Marketing Digital" (Power BI)
-- ---------------------------------------------------------------------
-- Registra el recurso en la tabla `recursos` para que la Edge Function
-- request-download lo encuentre por su slug.
--
-- Path en Storage: bucket 'recursos' → carpeta 'mk-digital' → ProyectoMarketing.pbix
--
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================================

insert into public.recursos (slug, nombre, descripcion, tecnologia, storage_path, activo)
values (
  'marketing-digital-powerbi',
  'Dashboard Marketing Digital',
  'Plantilla de Power BI para monitorizar campañas de marketing digital: KPIs, rendimiento por canal, conversiones y ROAS.',
  'Power BI',
  'mk-digital/ProyectoMarketing.pbix',
  true
)
on conflict (slug) do update set
  nombre       = excluded.nombre,
  descripcion  = excluded.descripcion,
  tecnologia   = excluded.tecnologia,
  storage_path = excluded.storage_path,
  activo       = excluded.activo;
