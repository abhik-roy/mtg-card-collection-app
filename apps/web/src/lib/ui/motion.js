const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function throttleRAF(fn) {
  let ticking = false;
  let lastArgs;

  return function throttled(...args) {
    lastArgs = args;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      fn.apply(this, lastArgs);
    });
  };
}

export function attachSpotlight(element) {
  if (!element || prefersReducedMotion.matches) {
    return;
  }

  if (element.dataset.spotlightBound) {
    return;
  }

  const update = throttleRAF((event) => {
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty('--mx', `${x}%`);
    element.style.setProperty('--my', `${y}%`);
  });

  element.addEventListener('pointermove', update, { passive: true });
  element.addEventListener(
    'pointerleave',
    () => {
      element.style.removeProperty('--mx');
      element.style.removeProperty('--my');
    },
    { passive: true },
  );

  element.dataset.spotlightBound = 'true';
}

export function revealOnView(selector) {
  if (prefersReducedMotion.matches) {
    document.querySelectorAll(selector).forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const elements = Array.from(document.querySelectorAll(selector));
  if (!elements.length || !('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    },
  );

  elements.forEach((el) => observer.observe(el));
}
