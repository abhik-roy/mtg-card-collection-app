export function bindKbdList(container, itemSelector = '.search-result') {
  if (!(container instanceof HTMLElement) || container.dataset.kbdBound === 'true') {
    return;
  }

  const items = () => Array.from(container.querySelectorAll(itemSelector)).filter((el) => el instanceof HTMLElement);

  const setActive = (index) => {
    items().forEach((item, idx) => {
      const isActive = idx === index;
      item.setAttribute('tabindex', isActive ? '0' : '-1');
      item.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        item.focus();
      }
    });
  };

  container.setAttribute('role', container.getAttribute('role') || 'listbox');
  container.setAttribute('tabindex', '0');

  container.addEventListener(
    'keydown',
    (event) => {
      const key = event.key;
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(key)) {
        return;
      }
      const listItems = items();
      if (!listItems.length) return;

      const currentIndex = listItems.findIndex((item) => item === document.activeElement);
      let nextIndex = currentIndex;

      if (key === 'ArrowDown') {
        nextIndex = currentIndex >= listItems.length - 1 ? 0 : currentIndex + 1;
        event.preventDefault();
        setActive(nextIndex);
      } else if (key === 'ArrowUp') {
        nextIndex = currentIndex <= 0 ? listItems.length - 1 : currentIndex - 1;
        event.preventDefault();
        setActive(nextIndex);
      } else if (key === 'Home') {
        event.preventDefault();
        setActive(0);
      } else if (key === 'End') {
        event.preventDefault();
        setActive(listItems.length - 1);
      } else if (key === 'Enter') {
        if (currentIndex >= 0 && listItems[currentIndex]) {
          event.preventDefault();
          listItems[currentIndex].click();
        }
      }
    },
  );

  container.addEventListener(
    'focus',
    () => {
      const listItems = items();
      if (!listItems.length) return;
      const currentIndex = listItems.findIndex((item) => item === document.activeElement);
      if (currentIndex === -1) {
        setActive(0);
      }
    },
    { passive: true },
  );

  items().forEach((item) => {
    item.setAttribute('role', item.getAttribute('role') || 'option');
    item.setAttribute('tabindex', '-1');
  });

  container.dataset.kbdBound = 'true';
}
