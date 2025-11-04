export function enableContentVisibility(selector) {
  if (typeof CSS === 'undefined' || !CSS.supports('content-visibility', 'auto')) {
    return;
  }

  const targets = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
  if (!targets) return;

  Array.from(targets).forEach((element) => {
    if (element instanceof HTMLElement) {
      element.style.contentVisibility = 'auto';
      element.style.contain = element.style.contain || 'layout paint size style';
    }
  });
}

export function lazyImages(scope = document) {
  const images = scope.querySelectorAll('img:not([loading="eager"])');
  images.forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
  });
}
