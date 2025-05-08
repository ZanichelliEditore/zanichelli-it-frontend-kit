import { Component, Fragment, Prop, State, Watch, h } from '@stencil/core';
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
 * Menubar component. Each item can have a menu with subitems or a sub-menubar.
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

  private renderChevronDown() {
    return (
      <svg
        class="icon"
        viewBox="0 0 1000 1000"
      >
        <path d="M500 662L880 280 935 335 501 770 66 336 121 280Z" />
      </svg>
    );
  }

  private renderChevronUp() {
    return (
      <svg
        class="icon"
        viewBox="0 0 1000 1000"
      >
        <path d="M66 674L501 240 935 675 880 730 500 348 121 730Z" />
      </svg>
    );
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

  private onMenuHolderFocus(item: MenubarItem) {
    if (!item.menuItems?.length) {
      return;
    }

    this.openMenu = item.id;
  }

  private onMenuHolderLeave(item: MenubarItem) {
    if (this.openMenu !== item.id) {
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
      <nav class="menubar">
        <ul>
          {this.items.map((item) => (
            <Fragment>
              <li>
                <a
                  href={item.href}
                  id={item.id}
                  class={{ 'menubar-item': true, 'body-4': true, 'active': this.isActive(item) }}
                  onMouseEnter={() => this.onMenuHolderFocus(item)}
                  onFocusin={() => this.onMenuHolderFocus(item)}
                  onFocusout={() => this.onMenuHolderLeave(item)}
                  onMouseLeave={() => this.onMenuHolderLeave(item)}
                >
                  <span data-text={item.label}>{item.label}</span>
                  {item.menuItems?.length > 0 &&
                    (this.openMenu === item.id ? this.renderChevronUp() : this.renderChevronDown())}
                </a>
              </li>
              <Menu
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
                <ul>
                  {item.navbarItems.map((subitem) => (
                    <Fragment>
                      <li>
                        <a
                          class={{ 'menubar-item': true, 'body-4': true, 'active': this.isActive(subitem) }}
                          href={subitem.href}
                          onMouseEnter={() => this.onMenuHolderFocus(subitem)}
                          onFocusin={() => this.onMenuHolderFocus(subitem)}
                          onFocusout={() => this.onMenuHolderLeave(subitem)}
                          onMouseLeave={() => this.onMenuHolderLeave(subitem)}
                        >
                          <span>{subitem.label}</span>
                          {subitem.menuItems?.length > 0 &&
                            (this.openMenu === subitem.id ? this.renderChevronUp() : this.renderChevronDown())}
                        </a>
                      </li>
                      <Menu
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
