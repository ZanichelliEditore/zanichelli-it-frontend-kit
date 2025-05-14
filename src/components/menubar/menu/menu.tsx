import { FunctionalComponent, h } from '@stencil/core';
import { MenuItem } from '../menubar';

/**
 * Props of the menu component.
 * @mebmer {string} controlledBy - The HTML id of the element that controls the menu.
 * @member {boolean} open - Whether the menu is open or not.
 * @member {MenuItem[]} items - The items to show in the menu.
 * @member {string} current - The id of the current active item.
 * @member {function} onFocusout - The function to call when the menu loses focus.
 */
export interface MenuProps {
  controlledBy: string;
  open?: boolean;
  items?: MenuItem[];
  current?: string;
  onFocusout?: (event: FocusEvent) => void;
}

const DEFAULT_GROUP_KEY = 'default';
const DEFAULT_GROUP = {
  id: DEFAULT_GROUP_KEY,
  label: DEFAULT_GROUP_KEY,
};

/** Get the items grouped by their group. */
const getGroupedItems = (items: MenuItem[]) => {
  const groups = items.reduce<{ group: MenuProps['items'][number]['group']; items: MenuItem[] }[]>((grouped, item) => {
    const itemGroup = grouped.find(({ group }) => group.id === (item.group?.id || DEFAULT_GROUP.id));
    if (!itemGroup) {
      grouped.push({ group: item.group ?? DEFAULT_GROUP, items: [item] });
    } else {
      itemGroup.items.push(item);
    }

    return grouped;
  }, []);

  // Sort to keep default group at the end
  return groups.sort((a, b) => (a.group.id === DEFAULT_GROUP_KEY ? 1 : b.group.id === DEFAULT_GROUP_KEY ? -1 : 0));
};

/** Get the previous element with `role=group`. */
const getPreviousGroup = (groupContainer: HTMLElement) => {
  const groups = Array.from(
    groupContainer?.closest('[role="menu"]')?.querySelectorAll('[role="group"]') ?? []
  ) as HTMLElement[];
  const currentIndex = groups.indexOf(groupContainer);

  return groups[currentIndex - 1];
};

/** Get the next element with `role=group`. */
const getNextGroup = (groupContainer: HTMLElement) => {
  const groups = Array.from(
    groupContainer?.closest('[role="menu"]')?.querySelectorAll('[role="group"]') ?? []
  ) as HTMLElement[];
  const currentIndex = groups.indexOf(groupContainer);

  return groups[currentIndex + 1];
};

const moveFocus = (current: HTMLAnchorElement, next: HTMLAnchorElement) => {
  current.tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
};

/** Handles keyboard navigation in the menu. */
const onKeyDown = (event: KeyboardEvent) => {
  const menuItem = event.target as HTMLAnchorElement;
  const items = Array.from(
    menuItem.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]') ?? []
  ) as HTMLAnchorElement[];
  const currentIndex = items.indexOf(menuItem);
  switch (event.key) {
    case 'ArrowUp': {
      event.preventDefault();
      event.stopPropagation();
      const prevItem = items[currentIndex - 1] || items[items.length - 1];
      moveFocus(menuItem, prevItem);
      break;
    }
    case 'ArrowRight': {
      // If the menu is horizontal, move to the next group if any, otherwise let the event bubble up
      const currentGroup = menuItem.closest('[role=group]') as HTMLElement;
      const nextGroup = getNextGroup(currentGroup);
      if (!nextGroup) {
        menuItem.tabIndex = -1;
        // If there is no next group, let the menubar handle the event
        break;
      }
      event.preventDefault();
      event.stopPropagation();
      const nextGroupItems = (nextGroup.querySelectorAll('[role="menuitem"]') ?? []) as HTMLAnchorElement[];
      moveFocus(menuItem, nextGroupItems[0]);
      break;
    }
    case 'ArrowDown': {
      event.preventDefault();
      event.stopPropagation();
      const nextItem = items[currentIndex + 1] || items[0];
      moveFocus(menuItem, nextItem);
      break;
    }
    case 'ArrowLeft':
      // If the menu is horizontal, move to the previous group if any, otherwise let the event bubble up
      const currentGroup = menuItem.closest('[role=group]') as HTMLElement;
      const prevGroup = getPreviousGroup(currentGroup);
      if (!prevGroup) {
        menuItem.tabIndex = -1;
        // If there is no previous group, let the menubar handle the event
        break;
      }
      event.preventDefault();
      event.stopPropagation();
      const prevGroupItems = (prevGroup.querySelectorAll('[role="menuitem"]') ?? []) as HTMLAnchorElement[];
      moveFocus(menuItem, prevGroupItems[0]);
      break;
    case 'Home':
      // Move to the first menu item
      event.preventDefault();
      event.stopPropagation();
      moveFocus(menuItem, items[0]);
      break;
    case 'End':
      // Move to the last menu item
      event.preventDefault();
      event.stopPropagation();
      moveFocus(menuItem, items[items.length - 1]);
      break;
  }
};

/** Handles the focusout by setting the tabIndex of all menu items to -1 and then calling the passed callback. */
const handleFocusout = (event: FocusEvent, callback: MenuProps['onFocusout']) => {
  const menu = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (menu.contains(relatedTarget)) {
    return;
  }

  menu.querySelectorAll('[role="menuitem"]').forEach((item) => {
    (item as HTMLAnchorElement).tabIndex = -1;
  });
  callback(event);
};

/**
 * Floating menu component. It shows a list of items that can be grouped.
 * The menu is shown when the `open` prop is true.
 */
export const Menu: FunctionalComponent<MenuProps> = ({ controlledBy, open, items, current, onFocusout }) => {
  if (!items?.length) {
    return null;
  }

  const groups = getGroupedItems(items);

  return (
    <div
      class={{ 'floating-menu': true, open }}
      aria-labelledby={controlledBy}
      role="menu"
      onFocusout={(event) => handleFocusout(event, onFocusout)}
    >
      {groups.map(({ group, items }) => (
        <div
          class="group"
          role="none"
        >
          {group.id !== DEFAULT_GROUP_KEY ? (
            <div
              class="group-name body-5-md"
              id={group.id}
            >
              {group.label}
            </div>
          ) : groups.length > 1 ? (
            // empty div to keep the same height as the other groups
            <div class="group-name" />
          ) : null}
          <ul
            class="menu-list"
            role="group"
            aria-labelledby={group.id !== DEFAULT_GROUP_KEY ? group.id : undefined}
          >
            {items.map((item) => (
              <li
                class="menu-item"
                role="none"
              >
                {item.href && (
                  <a
                    class={{ 'interactive-1-md': true, 'active': current === item.id }}
                    href={item.href}
                    role="menuitem"
                    tabIndex={-1}
                    aria-current={current === item.id ? 'page' : 'false'}
                    onKeyDown={(event) => onKeyDown(event)}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
