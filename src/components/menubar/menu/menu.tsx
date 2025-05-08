import { FunctionalComponent, h } from '@stencil/core';
import { MenuItem } from '../menubar';

interface MenuProps {
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

export const Menu: FunctionalComponent<MenuProps> = ({ open, items, current }) => {
  if (!items?.length || !open) {
    return null;
  }

  const groupedItems = groupItems(items);
  return (
    <div class="floating-menu">
      {groupedItems.map(({ group, items }) => (
        <div class="group">
          {groupedItems.length > 1 && <div class="group-name body-5-md">{group !== DEFAULT_GROUP_KEY && group}</div>}
          <ul class="menu-list">
            {items.map((item) => (
              <li class="menu-item">
                {item.href && (
                  <a
                    class={{ 'interactive-1-md': true, 'active': current === item.id }}
                    href={item.href}
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
