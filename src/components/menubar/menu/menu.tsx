import { FunctionalComponent, h } from '@stencil/core';
import { MenuItem } from '../../../utils';

/**
 * Menu of items that can be grouped.
 * @member {string} controlledBy - The HTML id of the element that controls the menu.
 * @member {MenuItem[]} items - The items to show in the menu.
 * @member {string[]} currentPath - Path of current item.
 * @member {function} onItemKeyDown - The function to call when a key is pressed from a menuitem.
 */
export interface MenuProps {
  controlledBy?: string;
  items?: MenuItem[];
  currentPath?: string[];
  onItemKeyDown?: (event: KeyboardEvent) => void;
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

/**
 * Floating menu component. It shows a list of items that can be grouped.
 */
export const Menu: FunctionalComponent<MenuProps> = ({ controlledBy, items, currentPath = [], onItemKeyDown }) => {
  if (!items?.length) {
    return null;
  }

  const groups = getGroupedItems(items);

  const isActive = (item: MenuItem) => currentPath.includes(controlledBy) && currentPath.includes(item.id);

  return (
    <div
      class="menu-wrapper"
      role="none"
    >
      <div
        class="menu"
        aria-labelledby={controlledBy ?? undefined}
        role="menu"
      >
        {groups.map(({ group, items }) => (
          <div class={{ group: true, highlight: items.some((item) => item.highlight) }}>
            {group.id !== DEFAULT_GROUP_KEY ? (
              <div
                class="group-name"
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
                <li role="none">
                  {item.href && (
                    <a
                      class={{
                        'menu-item': true,
                        'active': isActive(item),
                      }}
                      href={item.href}
                      role="menuitem"
                      tabIndex={0}
                      aria-current={isActive(item) ? 'page' : 'false'}
                      onKeyDown={(event) => onItemKeyDown(event)}
                      target={item.target}
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
    </div>
  );
};
