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
