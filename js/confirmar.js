/* ===================================
   CONFIRMAR DESCARGA — handler de la página confirmar.html
   ---------------------------------------------------------------------
   Lee ?token=XXX de la URL → llama a la Edge Function 'confirm-download'
   → muestra botón de descarga con la signed URL.
   =================================== */

(async function () {
  const stateLoading = document.getElementById('stateLoading');
  const stateSuccess = document.getElementById('stateSuccess');
  const stateError   = document.getElementById('stateError');
  const successTitle = document.getElementById('successTitle');
  const downloadLink = document.getElementById('downloadLink');
  const errorMsg     = document.getElementById('errorMsg');

  function show(el) {
    [stateLoading, stateSuccess, stateError].forEach(s => s && (s.hidden = true));
    el && (el.hidden = false);
  }

  function fail(msg) {
    if (errorMsg && msg) errorMsg.textContent = msg;
    show(stateError);
  }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    fail('Falta el token de confirmación en la URL.');
    return;
  }

  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes('TU-PROYECTO')) {
    fail('La configuración de Supabase no está rellena. Edita js/supabase-config.js.');
    return;
  }

  try {
    const res = await fetch(`${cfg.url}/functions/v1/confirm-download`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        cfg.anonKey,
        'Authorization': `Bearer ${cfg.anonKey}`,
      },
      body: JSON.stringify({ token }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      fail(data.error || `Error ${res.status}`);
      return;
    }

    if (successTitle && data.nombre_recurso) {
      successTitle.textContent = `¡${data.nombre_recurso} listo!`;
    }
    if (downloadLink && data.download_url) {
      downloadLink.href = data.download_url;
      // Algunos navegadores ignoran download cross-origin; el atributo
      // download del header Content-Disposition de la signed URL lo arregla.
      downloadLink.setAttribute('download', '');
    }

    show(stateSuccess);

    // Auto-disparar la descarga al cabo de medio segundo
    setTimeout(() => {
      if (downloadLink) downloadLink.click();
    }, 500);

  } catch (err) {
    console.error(err);
    fail('No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.');
  }
})();
