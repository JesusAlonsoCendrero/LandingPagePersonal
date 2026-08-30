/* ===================================
   DESCARGA DIRECTA — Form handler
   ---------------------------------------------------------------------
   Flujo de descarga SIN doble opt-in por email, pero que SÍ guarda el
   lead en Supabase (tablas `descargas` + `optin_comercial`) para ir
   construyendo la base de clientes.

   Al enviar el formulario:
     1) POST a la Edge Function `registrar-descarga` (registra el lead).
     2) Si responde OK → se revela y dispara la descarga del fichero.
     3) Si falla → estado de error (el usuario reintenta; así no perdemos
        el lead ni damos la descarga sin registrar el consentimiento).

   Configuración por página (atributos data- en el <body>):
     data-recurso-slug   → slug del recurso en la tabla `recursos`
     data-download-file  → ruta al fichero a descargar (obligatorio)
     data-download-name  → nombre sugerido del fichero al guardar (opcional)
   =================================== */

(function () {
  const form        = document.getElementById('downloadForm');
  const stepForm    = document.getElementById('stepForm');
  const stepSuccess = document.getElementById('stepSuccess');
  const stepError   = document.getElementById('stepError');
  const errorMsg    = document.getElementById('errorMsg');
  const submitBtn   = document.getElementById('downloadSubmit');
  const retryBtn    = document.getElementById('retryBtn');
  const downloadBtn = document.getElementById('downloadFileBtn');

  if (!form) return;

  const slug     = document.body.dataset.recursoSlug || '';
  const fileUrl  = document.body.dataset.downloadFile || '';
  const fileName = document.body.dataset.downloadName || '';

  function showStep(step) {
    [stepForm, stepSuccess, stepError].forEach(s => s && (s.hidden = true));
    step && (step.hidden = false);
  }

  function triggerDownload() {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    if (fileName) a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Botón visible de la pantalla de éxito con href real (fallback si el
  // navegador bloquea el click programático).
  if (downloadBtn && fileUrl) {
    downloadBtn.href = fileUrl;
    if (fileName) downloadBtn.setAttribute('download', fileName);
  }

  async function registrarLead({ email, nombre, empresa, consent }) {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes('TU-PROYECTO')) {
      throw new Error('Falta configurar Supabase en js/supabase-config.js.');
    }

    const res = await fetch(`${cfg.url}/functions/v1/registrar-descarga`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        cfg.anonKey,
        'Authorization': `Bearer ${cfg.anonKey}`,
      },
      body: JSON.stringify({
        recurso_slug:      slug,
        email,
        nombre,
        empresa,
        consent_comercial: consent,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Error ${res.status}`);
    }
    return data;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const email   = form.email.value.trim();
    const nombre  = form.nombre.value.trim();
    const empresa = form.empresa.value.trim();
    const consent = form.consentComercial.checked;

    if (!email || !form.email.checkValidity()) {
      form.email.focus();
      shake(form.email.closest('.form-field'));
      return;
    }
    if (!empresa) {
      form.empresa.focus();
      shake(form.empresa.closest('.form-field'));
      return;
    }
    if (!consent) {
      form.consentComercial.focus();
      shake(form.querySelector('.check-field'));
      return;
    }

    submitBtn.disabled = true;
    const labelSpan = submitBtn.querySelector('span');
    const originalLabel = labelSpan ? labelSpan.textContent : '';
    if (labelSpan) labelSpan.textContent = 'Preparando...';

    try {
      await registrarLead({ email, nombre, empresa, consent });
      showStep(stepSuccess);
      triggerDownload();
    } catch (err) {
      if (errorMsg) errorMsg.textContent = err.message || 'Error inesperado.';
      showStep(stepError);
    } finally {
      submitBtn.disabled = false;
      if (labelSpan) labelSpan.textContent = originalLabel;
    }
  });

  retryBtn && retryBtn.addEventListener('click', () => showStep(stepForm));

  function shake(node) {
    if (!node) return;
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
  }
})();
