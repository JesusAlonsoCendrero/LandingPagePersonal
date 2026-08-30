-- =====================================================================
-- INSERT: nuevo recurso "Prompt instalación Skills Microsoft" (Claude Code)
-- ---------------------------------------------------------------------
-- Registra el recurso en la tabla `recursos` para que la Edge Function
-- `registrar-descarga` lo encuentre por su slug y valide el lead.
--
-- OJO: este recurso es de DESCARGA DIRECTA. El fichero .txt se sirve
-- desde el propio sitio (assets/descargas/), NO desde Storage. La columna
-- storage_path se rellena solo por consistencia de esquema; la función
-- `registrar-descarga` no la usa.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================================

insert into public.recursos (slug, nombre, descripcion, tecnologia, storage_path, activo)
values (
  'prompt-skills-microsoft',
  'Prompt instalación Skills Microsoft',
  'Prompt listo para pegar en Claude Code que instala las Skills oficiales de Power Platform de Microsoft y deja el plugin de Power Automate funcionando.',
  'Claude Code',
  'directo/prompt-instalacion-skills-microsoft.txt',
  true
)
on conflict (slug) do update set
  nombre       = excluded.nombre,
  descripcion  = excluded.descripcion,
  tecnologia   = excluded.tecnologia,
  storage_path = excluded.storage_path,
  activo       = excluded.activo;
