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
  next.focus();
};
