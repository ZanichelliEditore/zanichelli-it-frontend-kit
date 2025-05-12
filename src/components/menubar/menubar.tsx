import { Component, Element, Fragment, Listen, Prop, State, Watch, h } from '@stencil/core';
import { Menu } from './menu/menu';

export type MenuItem = {
  label: string;
  href?: string;
  id?: string;
  group?: string;
};
export type MenubarItem = Omit<MenuItem, 'group'> & {
  navbarItems?: MenubarItem[];
  menuItems?: MenuItem[];
};

/**
 * Main menubar component. Each item can have a menu with subitems
 * When a main menubar item is the current active one, a sub-menubar is shown and each subitem can have a menu with subitems.
 * @cssprop {--zanit-menubar-bg-color} Background color of the menubar.
 * @cssprop {--zanit-menubar-fg-color} Text color of the menubar.
 * @cssprop {--zanit-menubar-secondary-color} Secondary color of the menubar. Used for decorations and texts of different color.
 * @cssprop {--zanit-menubar-max-width} Maximum width of the menubar.
 */
@Component({
  tag: 'zanit-menubar',
  styleUrls: ['menubar.css', 'menu/menu.css', '../../style/typography.css'],
  shadow: true,
})
export class ZanitMenubar {
  @Element() host: HTMLZanitMenubarElement;
  /** The data to build the menu (as an array of `MenuItem` or a JSON array) or the url to fetch to retrieve it. */
  @Prop() data: Promise<MenubarItem[]> | MenubarItem[] | URL | string;

  /** ID of the current active item. */
  @Prop() current: string | undefined = undefined;

  /** Menubar items extracted from `data`. */
  @State() items: MenubarItem[] = [];

  /** ID of the currently open floating menu. */
  @State() openMenu: string | undefined = undefined;

  /** ID of the item to show the subitems navbar for. */
  @State() openNavbar: string | undefined = undefined;

  @State() activeItem: MenubarItem | MenuItem | undefined = undefined;

  /** Fetch data from passed URL */
  private async fetchData(url: URL) {
    try {
      const data = await (await fetch(url)).json();
      if (!Array.isArray(data) || !data.every((item) => item satisfies MenubarItem)) {
        throw new Error('Invalid data structure. Expected an array of MenuItem objects.');
      }

      return data as MenubarItem[];
    } catch (error) {
      console.error('Error fetching menubar data:', error);
      throw new Error('Failed to fetch menubar data from the provided URL.', { cause: error });
    }
  }

  /** Check validity of passed data and retrieve/parse items. */
  @Watch('data')
  async parseData(data: typeof this.data) {
    if (!data) {
      return;
    }

    if (data instanceof URL) {
      this.items = await this.fetchData(data);
    } else if (data instanceof Promise) {
      this.items = await data;
    } else if (typeof data === 'string') {
      try {
        this.items = JSON.parse(data);
        if (!Array.isArray(this.items) || !this.items.every((item) => item satisfies MenubarItem)) {
          throw new Error('Expected an array of MenuItem objects.');
        }

        return;
      } catch {
        let url: URL;
        try {
          url = new URL(data);
        } catch (error) {
          throw new Error('Invalid string provided for `data` property: not a valid url or JSON.');
        }

        this.items = await this.fetchData(url);
      }
    } else if (Array.isArray(data) && data.every((item) => item satisfies MenubarItem)) {
      this.items = data;
    } else {
      throw new Error(
        'Invalid `data` property value. Expected an url, a JSON or an array/promise of MenuItem objects.'
      );
    }
  }

  private isActive(item: MenubarItem) {
    if (item.id === this.current) {
      return true;
    }

    if (item.menuItems?.length) {
      return item.menuItems.some((menuItem) => menuItem.id === this.current);
    }

    if (item.navbarItems?.length) {
      const isActive = item.navbarItems.some((navbarItem) => this.isActive(navbarItem));
      if (isActive) {
        return true;
      }
    }

    return false;
  }

  private openFloatingMenu(item: MenubarItem) {
    if (!item.menuItems?.length) {
      return;
    }

    this.openMenu = item.id;
  }

  /** Close any open menu when clicking outside this component. */
  @Listen('pointerdown', { target: 'document' })
  handleOutsideClick(event: MouseEvent) {
    if (this.host.contains(event.target as Node)) {
      return;
    }

    this.openMenu = undefined;
  }

  connectedCallback() {
    this.parseData(this.data);
  }

  render() {
    if (!this.items?.length) {
      return;
    }

    return (
      <nav
        class="menubar"
        aria-label="Zanichelli.it"
      >
        <ul role="menubar">
          {this.items.map((item) => (
            <Fragment>
              <li role="none">
                <a
                  class={{ 'menubar-item': true, 'body-4': true, 'active': this.isActive(item) }}
                  href={item.href}
                  id={item.id}
                  role="menuitem"
                  aria-expanded={this.openMenu === item.id ? 'true' : 'false'}
                  aria-haspopup={item.menuItems?.length ? 'true' : 'false'}
                  aria-current={this.current === item.id ? 'page' : 'false'}
                  onPointerOver={() => this.openFloatingMenu(item)}
                >
                  <span data-text={item.label}>{item.label}</span>
                  {item.menuItems?.length > 0 &&
                    (this.openMenu === item.id ? <z-icon name="chevron-up" /> : <z-icon name="chevron-down" />)}
                </a>
              </li>
              <Menu
                controlledBy={item.id}
                open={this.openMenu === item.id}
                items={item.menuItems}
                current={this.current}
              />
            </Fragment>
          ))}
        </ul>

        {this.items.map(
          (item) =>
            item.navbarItems?.length && (
              <nav class={{ 'sub-menubar': true, 'visible': this.isActive(item) }}>
                <ul role="menubar">
                  {item.navbarItems.map((subitem) => (
                    <Fragment>
                      <li role="none">
                        <a
                          class={{ 'menubar-item': true, 'body-4': true, 'active': this.isActive(subitem) }}
                          href={subitem.href}
                          id={subitem.id}
                          role="menuitem"
                          aria-haspopup={subitem.menuItems?.length ? 'true' : 'false'}
                          aria-expanded={this.openMenu === subitem.id ? 'true' : 'false'}
                          aria-current={this.current === item.id ? 'page' : 'false'}
                          onPointerOver={() => this.openFloatingMenu(subitem)}
                        >
                          <span>{subitem.label}</span>
                          {subitem.menuItems?.length > 0 &&
                            (this.openMenu === subitem.id ? (
                              <z-icon name="chevron-up" />
                            ) : (
                              <z-icon name="chevron-down" />
                            ))}
                        </a>
                      </li>
                      <Menu
                        controlledBy={subitem.id}
                        open={this.openMenu === subitem.id}
                        items={subitem.menuItems}
                        current={this.current}
                      />
                    </Fragment>
                  ))}
                </ul>
              </nav>
            )
        )}
      </nav>
    );
  }
}
