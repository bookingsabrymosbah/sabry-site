// Menu mobile
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const navBackdrop = document.getElementById('navBackdrop');

function setNavOpen(open) {
  mainNav.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  if (navBackdrop) navBackdrop.classList.toggle('open', open);
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    setNavOpen(!mainNav.classList.contains('open'));
  });

  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setNavOpen(false));
  });

  if (navBackdrop) {
    navBackdrop.addEventListener('click', () => setNavOpen(false));
  }
}

// Animations de révélation au scroll
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIO = 'IntersectionObserver' in window;
  if (prefersReduced || !supportsIO) return; // contenu déjà visible par défaut

  document.documentElement.classList.add('js-reveal');

  // Décalage progressif (stagger) pour les groupes désignés
  document.querySelectorAll('[data-reveal-stagger]').forEach((group) => {
    const step = parseInt(group.dataset.revealStagger, 10) || 100;
    group.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = i * step + 'ms';
    });
  });

  const SELECTOR = '[data-reveal]:not(.is-visible), [data-reveal-load]:not(.is-visible)';

  /* Marque l'apparition comme terminée, ce qui rend la main aux
     transitions de survol (plus courtes) que la règle d'apparition,
     plus spécifique, masquerait sinon. Idempotent. */
  function finish(el) {
    el.classList.add('reveal-done');
    el.style.transitionDelay = '';
  }

  function show(el) {
    if (el.classList.contains('is-visible')) return;
    el.classList.add('is-visible');

    /* On s'appuie sur transitionend plutôt que sur un minuteur :
       l'événement suit l'animation réelle, y compris si le
       navigateur l'a différée (onglet gelé en arrière-plan).
       Le minuteur ne sert que de filet si aucune transition
       n'a lieu (élément sans transition, animation coupée). */
    const onEnd = function (e) {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', onEnd);
      finish(el);
    };
    el.addEventListener('transitionend', onEnd);
    const delay = parseFloat(el.style.transitionDelay) || 0;
    setTimeout(function () {
      el.removeEventListener('transitionend', onEnd);
      finish(el);
    }, 1000 + delay);
  }

  /* Filet de sécurité.
     L'état masqué (opacity:0) n'est retiré que par du JS. Si le
     navigateur suspend requestAnimationFrame / IntersectionObserver
     — page ouverte dans un onglet d'arrière-plan, onglet restauré,
     économiseur de batterie — le contenu resterait invisible pour
     toujours. Ce balayage, indépendant de rAF, révèle tout ce qui
     se trouve à l'écran. Il ne casse pas l'effet : ce qui est
     sous la ligne de flottaison reste animé au scroll par l'observer. */
  function revealWhatIsOnScreen() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    document.querySelectorAll(SELECTOR).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) show(el);
    });
  }

  // Éléments déclenchés au chargement (hero) : setTimeout, pas rAF,
  // car setTimeout continue de s'exécuter même onglet masqué.
  setTimeout(() => {
    document.querySelectorAll('[data-reveal-load]').forEach(show);
    revealWhatIsOnScreen();
  }, 150);

  // Quand l'utilisateur revient sur l'onglet, on rattrape le retard.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revealWhatIsOnScreen();
  });
  window.addEventListener('pageshow', revealWhatIsOnScreen);

  // Éléments déclenchés au scroll, une seule fois
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          show(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  );

  document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
})();

/* ============================================================
   Parallax 2.5D au scroll
   Déplace l'image plus lentement que son conteneur pour créer
   une sensation de profondeur. Désactivé sur petit écran et si
   l'utilisateur demande moins d'animations.
   ============================================================ */
(function () {
  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallMQ = window.matchMedia('(max-width: 760px)');
  const items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (!items.length || !('IntersectionObserver' in window)) return;

  const visible = new Set();
  let ticking = false;
  let enabled = false;

  function render() {
    ticking = false;
    if (!enabled) return;
    const vh = window.innerHeight;
    visible.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.09;
      const rect = el.getBoundingClientRect();
      // -1 quand l'élément arrive par le bas, +1 quand il sort par le haut
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      const shift = -progress * speed * rect.height;
      el.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
    });
  }

  function schedule() {
    if (ticking || !enabled) return;
    ticking = true;
    requestAnimationFrame(render);
  }

  // On n'anime que ce qui approche du viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible.add(entry.target);
          entry.target.style.willChange = 'transform';
        } else {
          visible.delete(entry.target);
          entry.target.style.willChange = '';
        }
      });
      schedule();
    },
    { rootMargin: '25% 0px 25% 0px' }
  );

  function enable() {
    if (enabled) return;
    enabled = true;
    items.forEach((el) => observer.observe(el));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    visible.clear();
    items.forEach((el) => {
      el.style.transform = '';
      el.style.willChange = '';
    });
  }

  function sync() {
    if (reducedMQ.matches || smallMQ.matches) disable();
    else enable();
  }

  sync();
  // addEventListener sur MediaQueryList n'existe pas sur les vieux Safari
  ['change'].forEach((evt) => {
    if (reducedMQ.addEventListener) {
      reducedMQ.addEventListener(evt, sync);
      smallMQ.addEventListener(evt, sync);
    }
  });
})();

/* ============================================================
   Tilt 3D sur la pochette (souris uniquement)
   Sur tactile / mobile / mouvement réduit, l'élément reste
   simplement statique : aucune classe ni style n'est appliqué.
   ============================================================ */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const smallScreen = window.matchMedia('(max-width: 760px)').matches;
  if (reduced || !finePointer || smallScreen) return;

  const MAX_DEG = 9;

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    let frame = null;
    let rx = 0;
    let ry = 0;

    function apply() {
      frame = null;
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      // L'ombre suit le mouvement, à l'opposé de l'inclinaison
      const ox = (-ry / MAX_DEG) * 22;
      const oy = (rx / MAX_DEG) * 22 + 30;
      el.style.boxShadow = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px 60px -20px rgba(0,0,0,.75)';
    }

    el.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ry = Math.max(-MAX_DEG, Math.min(MAX_DEG, px * MAX_DEG * 2));
      rx = Math.max(-MAX_DEG, Math.min(MAX_DEG, -py * MAX_DEG * 2));
      el.classList.add('is-tilting');
      el.style.willChange = 'transform';
      if (!frame) frame = requestAnimationFrame(apply);
    });

    function reset() {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      el.classList.remove('is-tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
      el.style.boxShadow = '';
      el.style.willChange = '';
    }

    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset, true);
  });
})();

// Newsletter (démo locale, sans envoi réel)
const newsletterForm = document.getElementById('newsletterForm');
const newsletterThanks = document.getElementById('newsletterThanks');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    newsletterForm.hidden = true;
    newsletterThanks.hidden = false;
  });
}
