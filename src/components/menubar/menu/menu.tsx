import { FunctionalComponent, h } from '@stencil/core';
import { MenuItem } from '../menubar';

/**
 * Props of the menu component.
 * @mebmer {string} controlledBy - The HTML id of the element that controls the menu.
 * @member {boolean} open - Whether the menu is open or not.
 * @member {MenuItem[]} items - The items to show in the menu.
 * @member {string} current - The id of the current active item.
 */
export interface MenuProps {
  controlledBy: string;
  open?: boolean;
  items?: MenuItem[];
  current?: string;
}

const DEFAULT_GROUP_KEY = 'default';

const groupItems = (items: MenuItem[]) => {
  const groups: Record<string, MenuItem[]> = {};

  items.forEach((item) => {
    if (item.group) {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    } else {
      groups['default'] = groups['default'] || [];
      groups['default'].push(item);
    }
  });

  return (
    Object.entries(groups)
      .map(([group, items]) => ({
        group,
        items,
      }))
      // Sort to keep default group at the end
      .sort((a, b) => (a.group === DEFAULT_GROUP_KEY ? 1 : b.group === DEFAULT_GROUP_KEY ? -1 : 0))
  );
};

/**
 * Floating menu component. It shows a list of items that can be grouped.
 * The menu is shown when the `open` prop is true.
 */
export const Menu: FunctionalComponent<MenuProps> = ({ controlledBy, open, items, current }) => {
  if (!items?.length) {
    return null;
  }

  const groupedItems = groupItems(items);
  return (
    <div
      class={{ 'floating-menu': true, open }}
      aria-labelledby={controlledBy}
      role="menu"
    >
      {groupedItems.map(({ group, items }) => (
        <div
          class="group"
          role="none"
        >
          {groupedItems.length > 1 && <div class="group-name body-5-md">{group !== DEFAULT_GROUP_KEY && group}</div>}
          <ul
            class="menu-list"
            role="none"
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
                    aria-current={current === item.id ? 'page' : 'false'}
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
