/* ===================================
   DESCARGAS — Form handler
   ===================================
   Estado actual: MOCK (sin backend).
   Cuando integremos Supabase, reemplazar el bloque marcado
   con TODO por la llamada real a la Edge Function.
   =================================== */

(function () {
  const form        = document.getElementById('downloadForm');
  const stepForm    = document.getElementById('stepForm');
  const stepSuccess = document.getElementById('stepSuccess');
  const stepError   = document.getElementById('stepError');
  const successEmail = document.getElementById('successEmail');
  const errorMsg    = document.getElementById('errorMsg');
  const submitBtn   = document.getElementById('downloadSubmit');
  const retryBtn    = document.getElementById('retryBtn');
  const resendBtn   = document.getElementById('resendBtn');

  if (!form) return;

  const slug = document.body.dataset.recursoSlug;

  function showStep(step) {
    [stepForm, stepSuccess, stepError].forEach(s => s && (s.hidden = true));
    step && (step.hidden = false);
  }

  // Guardamos los datos del último envío con éxito para poder reenviar el correo
  // sin obligar al usuario a rellenar el formulario de nuevo.
  let lastSubmission = null;

  async function requestDownload({ email, nombre, empresa, consent }) {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes('TU-PROYECTO')) {
      throw new Error('Falta configurar Supabase en js/supabase-config.js.');
    }

    const res = await fetch(`${cfg.url}/functions/v1/request-download`, {
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

    if (!email) {
      form.email.focus();
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
    const originalLabel = labelSpan?.textContent;
    if (labelSpan) labelSpan.textContent = 'Enviando...';

    try {
      await requestDownload({ email, nombre, empresa, consent });
      lastSubmission = { email, nombre, empresa, consent };
      if (successEmail) successEmail.textContent = email;
      showStep(stepSuccess);
    } catch (err) {
      if (errorMsg) errorMsg.textContent = err.message || 'Error inesperado.';
      showStep(stepError);
    } finally {
      submitBtn.disabled = false;
      if (labelSpan && originalLabel) labelSpan.textContent = originalLabel;
    }
  });

  retryBtn && retryBtn.addEventListener('click', () => showStep(stepForm));

  resendBtn && resendBtn.addEventListener('click', async () => {
    if (!lastSubmission) {
      // No deberíamos llegar aquí porque el botón solo aparece tras un envío con éxito,
      // pero por si acaso devolvemos al usuario al formulario.
      showStep(stepForm);
      return;
    }
    resendBtn.disabled = true;
    resendBtn.textContent = 'Reenviando...';
    try {
      await requestDownload(lastSubmission);
      resendBtn.textContent = '¡Reenviado!';
    } catch {
      resendBtn.textContent = 'Error, inténtalo en unos segundos';
    } finally {
      setTimeout(() => {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Reenviar';
      }, 4000);
    }
  });

  function shake(node) {
    if (!node) return;
    node.classList.remove('shake');
    void node.offsetWidth;
    node.classList.add('shake');
  }
})();
