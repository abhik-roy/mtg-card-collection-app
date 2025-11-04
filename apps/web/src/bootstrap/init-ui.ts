import { lazyImages } from '../lib/ui/perf.js';

export function initUI(): void {
  const run = () => {
    requestAnimationFrame(() => {
      lazyImages(document);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
