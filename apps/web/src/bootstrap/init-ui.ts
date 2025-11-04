import { attachSpotlight, revealOnView } from '../lib/ui/motion.js';
import { bindDropdown } from '../lib/ui/dropdown.js';
import { bindKbdList } from '../lib/ui/kbdlist.js';
import { enableContentVisibility, lazyImages } from '../lib/ui/perf.js';

export function initUI(): void {
  const execute = () => {
    document.querySelectorAll<HTMLElement>('.card-thumb').forEach((el) => {
      attachSpotlight(el);
    });

    document.querySelectorAll<HTMLElement>('.dropdown').forEach((el) => {
      bindDropdown(el);
    });

    const searchResults = document.querySelector<HTMLElement>('.search-results');
    if (searchResults) {
      bindKbdList(searchResults);
    }

    revealOnView('[data-reveal]');
    lazyImages(document);
    enableContentVisibility('.collection-table, .listing-grid, .binder-page');
  };

  const run = () => {
    requestAnimationFrame(execute);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
