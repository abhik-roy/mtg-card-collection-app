const STATE_OPEN = 'open';

export function bindDropdown(root) {
  if (!(root instanceof HTMLElement) || root.dataset.dropdownBound === 'true') {
    return;
  }

  const trigger = root.querySelector('[aria-haspopup="menu"]');
  const menu = root.querySelector('[role="menu"]');

  if (!trigger || !menu) {
    root.dataset.dropdownBound = 'true';
    return;
  }

  const sync = () => {
    const isOpen = root.dataset.state === STATE_OPEN;
    trigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      menu.removeAttribute('hidden');
    } else {
      menu.setAttribute('hidden', 'hidden');
    }
  };

  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ['data-state'] });
  sync();

  root.dataset.dropdownBound = 'true';
}
