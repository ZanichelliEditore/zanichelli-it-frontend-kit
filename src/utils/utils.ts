/**
 * Check if an element contains an event target by checking its composedPath.
 * Useful when an event target may come from a component's shadow DOM.
 */
export const containsTarget = (ancestor: HTMLElement, event: Event) => {
  return event
    .composedPath()
    .filter((el) => el !== document && el !== window.window)
    .some((el) => ancestor.contains(el as HTMLElement));
};

/** Move the focus to `next` element, set tabindex to 0 for `next` and -1 to `current`. */
export const moveFocus = (current: HTMLElement, next: HTMLElement) => {
  current.tabIndex = -1;
  next.tabIndex = 0;
  next.focus({ preventScroll: true });
};

/** Check if event key is ArrowUp */
export const isArrowUpKey = (event: KeyboardEvent) => event.key === 'ArrowUp';

/** Check if event key is ArrowDown */
export const isArrowDownKey = (event: KeyboardEvent) => event.key === 'ArrowDown';

/** Check if event key is Tab */
export const isTabKey = (event: KeyboardEvent) => event.key === 'Tab';

/** Check if event key is Escape */
export const isEscKey = (event: KeyboardEvent) => event.key === 'Escape';
