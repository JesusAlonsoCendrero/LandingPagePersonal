/* ===================================
   JESÚS ALONSO — Main JS
   =================================== */

// ----------- CURSOR -----------
const cursor = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursorTrail');

if (cursor && cursorTrail) {
  let mouseX = 0, mouseY = 0;
  let trailX = 0, trailY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  function animateTrail() {
    trailX += (mouseX - trailX) * 0.12;
    trailY += (mouseY - trailY) * 0.12;
    cursorTrail.style.left = trailX + 'px';
    cursorTrail.style.top  = trailY + 'px';
    requestAnimationFrame(animateTrail);
  }
  animateTrail();
}

// ----------- NAV SCROLL -----------
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// ----------- MOBILE NAV -----------
const navToggle = document.getElementById('navToggle');
const navLinks  = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ----------- REVEAL ON SCROLL -----------
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ----------- SERVICE CARD TILT -----------
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `translateY(-4px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ----------- SMOOTH ANCHOR -----------
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ----------- LIGHTBOX (con galería navegable) -----------
const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightboxContent');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxCounter = document.getElementById('lightboxCounter');

let galleryState = null; // { items: [{type, src, alt}], index: 0 }

function renderGalleryItem() {
  if (!galleryState || !lightboxContent) return;
  const { items, index } = galleryState;
  const item = items[index];
  lightboxContent.innerHTML = '';
  let node;
  if (item.type === 'video') {
    node = document.createElement('video');
    node.src = item.src;
    node.controls = true;
    node.autoplay = true;
  } else {
    node = document.createElement('img');
    node.src = item.src;
    node.alt = item.alt || '';
  }
  lightboxContent.appendChild(node);
  if (lightboxCounter) lightboxCounter.textContent = `${index + 1} / ${items.length}`;
}

function openLightbox(input, startIndex = 0) {
  if (!lightbox || !lightboxContent) return;

  // Compatibilidad: si pasan un Element directamente, modo simple
  if (input instanceof Element) {
    galleryState = null;
    lightboxContent.innerHTML = '';
    lightboxContent.appendChild(input);
    lightbox.classList.remove('has-nav');
  } else {
    const items = Array.isArray(input) ? input : [input];
    galleryState = { items, index: startIndex };
    renderGalleryItem();
    lightbox.classList.toggle('has-nav', items.length > 1);
  }

  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox || !lightboxContent) return;
  lightbox.classList.remove('open');
  lightbox.classList.remove('has-nav');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxContent.innerHTML = '';
  galleryState = null;
  document.body.style.overflow = '';
}

function nextLightbox() {
  if (!galleryState) return;
  galleryState.index = (galleryState.index + 1) % galleryState.items.length;
  renderGalleryItem();
}
function prevLightbox() {
  if (!galleryState) return;
  galleryState.index = (galleryState.index - 1 + galleryState.items.length) % galleryState.items.length;
  renderGalleryItem();
}

if (lightbox) {
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
    if (e.key === 'ArrowLeft')  prevLightbox();
  });

  // Swipe en móvil
  let touchX = 0;
  lightbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (!galleryState) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? nextLightbox : prevLightbox)();
  }, { passive: true });
}
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxPrev)  lightboxPrev.addEventListener('click', e => { e.stopPropagation(); prevLightbox(); });
if (lightboxNext)  lightboxNext.addEventListener('click', e => { e.stopPropagation(); nextLightbox(); });

document.querySelectorAll('.media-item').forEach(item => {
  const type = item.dataset.mediaType;
  if (type === 'placeholder' || !type) return;

  item.addEventListener('click', e => {
    e.preventDefault();
    if (type === 'image') {
      const img = item.querySelector('img');
      if (!img) return;
      openLightbox({
        type: 'image',
        src:  img.currentSrc || img.src,
        alt:  img.alt || '',
      });
    } else if (type === 'video') {
      const src = item.querySelector('video')?.getAttribute('src');
      if (!src) return;
      openLightbox({ type: 'video', src });
    }
  });
});

// ----------- CAROUSEL (reusable) -----------
document.querySelectorAll('.carousel').forEach(carousel => {
  const track   = carousel.querySelector('.carousel-track');
  const slides  = Array.from(carousel.querySelectorAll('.carousel-slide'));
  const prevBtn = carousel.querySelector('.carousel-prev');
  const nextBtn = carousel.querySelector('.carousel-next');
  const dotsBox = carousel.querySelector('.carousel-dots');
  const counter = carousel.querySelector('.carousel-counter');
  const autoplay = parseInt(carousel.dataset.autoplay || '0', 10);

  if (!track || slides.length === 0) return;

  // Generar dots si hay contenedor
  let dots = [];
  if (dotsBox) {
    dotsBox.innerHTML = '';
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      d.type = 'button';
      d.setAttribute('aria-label', `Ir a slide ${i + 1}`);
      d.addEventListener('click', () => { go(i); restartAuto(); });
      dotsBox.appendChild(d);
    });
    dots = Array.from(dotsBox.children);
  }

  let index = 0;
  let timer = null;

  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle('active', di === index));
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  function startAuto() {
    if (!autoplay || timer) return;
    timer = setInterval(next, autoplay);
  }
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function restartAuto() { stopAuto(); startAuto(); }

  prevBtn && prevBtn.addEventListener('click', () => { prev(); restartAuto(); });
  nextBtn && nextBtn.addEventListener('click', () => { next(); restartAuto(); });

  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);

  // Click en slide → lightbox-galería con todas las imágenes del carrusel
  slides.forEach((slide, slideIdx) => {
    slide.addEventListener('click', () => {
      if (typeof openLightbox !== 'function') return;
      const items = slides.map(s => {
        const img = s.querySelector('img');
        return {
          type: 'image',
          src:  img ? (img.currentSrc || img.src) : '',
          alt:  img ? (img.alt || '') : '',
        };
      });
      openLightbox(items, slideIdx);
    });
  });

  // Teclado: flechas
  carousel.tabIndex = 0;
  carousel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { prev(); restartAuto(); }
    if (e.key === 'ArrowRight') { next(); restartAuto(); }
  });

  // Swipe en móvil
  let touchStartX = 0;
  let touchDeltaX = 0;
  carousel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
    stopAuto();
  }, { passive: true });
  carousel.addEventListener('touchmove', e => {
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }, { passive: true });
  carousel.addEventListener('touchend', () => {
    if (Math.abs(touchDeltaX) > 50) {
      if (touchDeltaX < 0) next(); else prev();
    }
    startAuto();
  }, { passive: true });

  // Inicial
  go(0);
  if (counter) counter.textContent = `1 / ${slides.length}`;
  startAuto();
});

// ----------- CONTACT FORM (Web3Forms + Supabase en paralelo) -----------
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  // INSERT en Supabase (fire-and-forget: si falla, el email a Web3Forms sigue llegando)
  async function logToSupabase(formData) {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return;
    try {
      await fetch(`${cfg.url}/rest/v1/contact_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          nombre:     formData.get('nombre') || '',
          email:      formData.get('email')  || '',
          empresa:    formData.get('empresa') || null,
          tipo:       formData.get('tipo')    || '',
          mensaje:    formData.get('mensaje') || '',
          user_agent: navigator.userAgent.slice(0, 500),
        }),
      });
    } catch (err) {
      console.warn('[supabase contact_messages] insert falló:', err);
    }
  }

  contactForm.addEventListener('submit', async e => {
    e.preventDefault();

    // Feedback visual del botón
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const submitSpan = submitBtn ? submitBtn.querySelector('span') : null;
    const originalLabel = submitSpan ? submitSpan.textContent : '';
    if (submitBtn) submitBtn.disabled = true;
    if (submitSpan) submitSpan.textContent = 'Enviando...';

    const formData = new FormData(contactForm);

    // Lanzamos el INSERT en Supabase en paralelo (no bloquea ni rompe el flujo)
    logToSupabase(formData);

    // Envío AJAX a Web3Forms (este sí determina el éxito que ve el usuario)
    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Limpiamos cualquier error previo
        const prevErr = contactForm.querySelector('.form-error');
        if (prevErr) prevErr.remove();

        // Restablecemos el form para la próxima vez (oculto, pero listo)
        contactForm.reset();
        contactForm.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        if (submitSpan) submitSpan.textContent = originalLabel || 'Enviar mensaje';

        // Reutilizamos un mensaje de éxito si ya existe (por reenvíos)
        let note = contactForm.parentNode.querySelector('.form-success');
        if (!note) {
          note = document.createElement('div');
          note.className = 'form-success';
          contactForm.parentNode.insertBefore(note, contactForm);
        }
        note.innerHTML = `
          <div class="form-success-text">
            <strong>¡Mensaje enviado!</strong> Te respondo en menos de 24 horas.
          </div>
          <button type="button" class="form-success-action">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2 10l16-7-7 16-2-7-7-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <span>Enviar otro mensaje</span>
          </button>
        `;
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });

        note.querySelector('.form-success-action').addEventListener('click', () => {
          note.remove();
          contactForm.style.display = '';
          const firstInput = contactForm.querySelector('input[name="nombre"]');
          if (firstInput) firstInput.focus({ preventScroll: true });
          contactForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        throw new Error(data.message || 'Error al enviar');
      }
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      if (submitSpan) submitSpan.textContent = originalLabel || 'Enviar mensaje';
      let errBox = contactForm.querySelector('.form-error');
      if (!errBox) {
        errBox = document.createElement('div');
        errBox.className = 'form-error';
        contactForm.insertBefore(errBox, submitBtn);
      }
      errBox.textContent = 'No se pudo enviar el mensaje. Inténtalo de nuevo o escríbeme directamente a jesusalonsocendrero@gmail.com.';
    }
  });
}
