import { Component, Element, Fragment, Listen, Prop, State, Watch, h } from '@stencil/core';
import { Menu } from './menu/menu';

export type MenuItem = {
  label: string;
  href?: string;
  id?: string;
  group?: { id: string; label: string };
};
export type MenubarItem = Omit<MenuItem, 'group'> & {
  navbarItems?: MenubarItem[];
  menuItems?: MenuItem[];
};

/**
 * Check if an element contains an event target by checking its composedPath.
 * Useful when an event target may come from a component's shadow DOM.
 */
const containsTarget = (ancestor: HTMLElement, event: Event) => {
  return event
    .composedPath()
    .filter((el) => el !== document && el !== window.window)
    .some((el) => ancestor.contains(el as HTMLElement));
};

/**
 * Main menubar component. Each item can have a menu with subitems
 * When a main menubar item is the current active one, a sub-menubar is shown and each subitem can have a menu with subitems.
 * @cssprop {--zanit-menubar-max-width} Maximum width of the menubar.
 */
@Component({
  tag: 'zanit-menubar',
  styleUrls: ['menubar.css', 'menu/menu.css', '../../style/typography.css'],
  shadow: true,
})
export class ZanitMenubar {
  private formElement: HTMLFormElement;

  @Element() host: HTMLZanitMenubarElement;

  /** Menubar items extracted from `data`. */
  @State() items: MenubarItem[] = [];

  /** ID of the currently open floating menu. */
  @State() openMenu: string | undefined = undefined;

  /** ID of the item to show the subitems navbar for. */
  @State() openNavbar: string | undefined = undefined;

  /** Indicates whether the searchbar is visible and usable. */
  @State() showSearchbar: boolean = false;

  /** Search query to apply. */
  @State() _searchQuery: string | undefined = undefined;

  /** The data to build the menu (as an array of `MenuItem` or a JSON array) or the url to fetch to retrieve it. */
  @Prop() data: Promise<MenubarItem[]> | MenubarItem[] | URL | string;

  /** ID of the current active item. */
  @Prop() current: string | undefined = undefined;

  /** Search query currently applied. */
  @Prop() searchQuery: string | undefined = undefined;

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

  /** Initialize tabindex on menuitems of menubars, setting -1 to all but the first one. */
  @Watch('items')
  initTabindex() {
    setTimeout(() => {
      this.host.shadowRoot.querySelectorAll('[role="menubar"]')?.forEach((menubar) => {
        menubar
          .querySelectorAll('[role="menuitem"]')
          ?.forEach((item, index) => item.setAttribute('tabindex', index === 0 ? '0' : '-1'));
      });
    }, 100);
  }

  @Watch('showSearchbar')
  handleSearchbarChange() {
    if (!this.showSearchbar) {
      return;
    }

    setTimeout(() => {
      const searchbarInput = this.host.shadowRoot.querySelector('#searchbar-input') as HTMLInputElement;
      if (this.showSearchbar) {
        searchbarInput.focus();
      }
    }, 10);
  }

  async connectedCallback() {
    await this.parseData(this.data);
    this.initTabindex();
  }

  /** Close open searchbar or any open menu when clicking outside. */
  @Listen('pointerdown', { target: 'document' })
  handleOutsideClick(event: MouseEvent) {
    if (this.showSearchbar && !containsTarget(this.formElement, event)) {
      this.showSearchbar = false;
    }

    if (containsTarget(this.host, event)) {
      return;
    }

    this.openMenu = undefined;
  }

  /** Close any open menu when pressing Escape or Tab. */
  @Listen('keydown')
  handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
      case 'Tab':
        this.openMenu = undefined;
        break;
    }
  }

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

  /** Indicates whether the element has to be highlighted by checking whether it is set as current or one of its descendants is. */
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

  /** Opens the floating menu, if any, associated with the `item`. */
  private openFloatingMenu(item: MenubarItem) {
    if (!item.menuItems?.length) {
      return;
    }

    this.openMenu = item.id;
  }

  /**
   * Get all elements with `menuitem` role of the `itemID`'s parent `menubar`.
   * @param itemID The id of the menu item.
   * */
  private getParentMenubarElements(itemID: string) {
    const itemElement = this.host.shadowRoot.querySelector(`[role="menuitem"]#${itemID}`) as HTMLElement;

    return Array.from(
      itemElement?.closest('[role="menubar"]')?.querySelectorAll(':scope > li [role="menuitem"]')
    ) as HTMLElement[];
  }

  /** Move the focus to the previous menubar item, or the last one. Then open its menu if any other menu was open. */
  private focusPreviousItem(itemID: string) {
    const menubarElements = this.getParentMenubarElements(itemID);
    const itemElement = menubarElements.find((el) => el.id === itemID) as HTMLElement;
    itemElement.tabIndex = -1;
    const currentIndex = menubarElements.indexOf(itemElement);
    const prevItem = menubarElements[(currentIndex - 1 + menubarElements.length) % menubarElements.length]; // get previous item or last one
    prevItem.tabIndex = 0;
    prevItem.focus();
    // open the item's menu if any other menu was open
    if (prevItem.ariaHasPopup === 'true' && this.openMenu) {
      this.openMenu = prevItem.id;
    }
  }

  /** Move the focus to the next menubar item, or the first one. Then open its menu if any other menu was open. */
  private focusNextItem(itemID: string) {
    const menubarElements = this.getParentMenubarElements(itemID);
    const itemElement = menubarElements.find((el) => el.id === itemID) as HTMLElement;
    itemElement.tabIndex = -1;
    const currentIndex = menubarElements.indexOf(itemElement);
    const nextItem = menubarElements[(currentIndex + 1) % menubarElements.length]; // get next item or first one
    nextItem.tabIndex = 0;
    nextItem.focus();
    // open the item's menu if any other menu was open
    if (nextItem.ariaHasPopup === 'true' && this.openMenu) {
      this.openMenu = nextItem.id;
    }
  }

  /** Handles keyboard navigation on menubar items. */
  private handleItemKeydown(event: KeyboardEvent, item: MenubarItem) {
    switch (event.key) {
      case 'Home':
      case 'PageUp': {
        event.preventDefault();
        event.stopPropagation();
        const firstItem = this.getParentMenubarElements(item.id)[0];
        firstItem.tabIndex = 0;
        firstItem.focus();
        break;
      }
      case 'End':
      case 'PageDown': {
        event.preventDefault();
        event.stopPropagation();
        const menubarElements = this.getParentMenubarElements(item.id);
        const lastItem = menubarElements[menubarElements.length - 1];
        lastItem.tabIndex = 0;
        lastItem.focus();
        break;
      }
      case 'ArrowUp': {
        if (!item.menuItems?.length) {
          break;
        }
        event.preventDefault();
        event.stopPropagation();
        this.openMenu = item.id;
        const menuItems = Array.from(
          this.host.shadowRoot.querySelectorAll(`[aria-labelledby=${item.id}] [role="menuitem"]`)
        ) as HTMLElement[];
        // focus last item of the floating menu
        setTimeout(() => {
          menuItems[menuItems.length - 1].tabIndex = 0;
          menuItems[menuItems.length - 1].focus();
        }, 10);
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        event.stopPropagation();
        this.focusNextItem(item.id);
        break;
      }
      case 'ArrowDown': {
        if (!item.menuItems?.length) {
          break;
        }
        const menuItems = Array.from(
          this.host.shadowRoot.querySelectorAll(`[aria-labelledby=${item.id}] [role="menuitem"]`)
        ) as HTMLElement[];
        this.openMenu = item.id;
        setTimeout(() => {
          // focus first item of the floating menu
          menuItems[0].tabIndex = 0;
          menuItems[0].focus();
        }, 10);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        event.stopPropagation();
        this.focusPreviousItem(item.id);
        break;
      }
    }
  }

  /** Handles keyboard navigation events from Menu. */
  private handleMenuKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        event.stopPropagation();
        const parentMenubar = (event.target as HTMLElement).closest('[role="menubar"]');
        const focusedItem = parentMenubar?.querySelector('[role="menuitem"][aria-expanded="true"][tabindex="0"]');
        this.focusNextItem(focusedItem.id);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        event.stopPropagation();
        const parentMenubar = (event.target as HTMLElement).closest('[role="menubar"]');
        const focusedItem = parentMenubar?.querySelector('[role="menuitem"][aria-expanded="true"][tabindex="0"]');
        this.focusPreviousItem(focusedItem.id);
        break;
      }
    }
  }

  private handleInputChange(event: Event) {
    this._searchQuery = (event.target as HTMLInputElement).value;
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (!this._searchQuery) {
      return;
    }

    this.formElement.submit();
  }

  render() {
    if (!this.items?.length) {
      return;
    }

    return (
      <nav aria-label="Zanichelli.it">
        <ul
          class="menubar"
          role="menubar"
          aria-label="Zanichelli.it"
          onKeyDown={(event) => this.handleMenuKeydown(event)}
        >
          {this.items.map((item, index) => (
            <Fragment>
              <li role="none">
                <a
                  class={{ 'menubar-item': true, 'active': this.isActive(item) }}
                  href={item.href}
                  id={item.id}
                  role="menuitem"
                  tabIndex={-1}
                  aria-expanded={this.openMenu === item.id ? 'true' : 'false'}
                  aria-haspopup={item.menuItems?.length ? 'true' : 'false'}
                  aria-current={this.current === item.id ? 'page' : 'false'}
                  onPointerOver={() => this.openFloatingMenu(item)}
                  onKeyDown={(event) => this.handleItemKeydown(event, item)}
                >
                  <span data-text={item.label}>{item.label}</span>
                  {item.menuItems?.length > 0 && (
                    <z-icon name={this.openMenu === item.id ? 'chevron-up' : 'chevron-down'} />
                  )}
                </a>
              </li>
              <Menu
                controlledBy={item.id}
                open={this.openMenu === item.id}
                items={item.menuItems}
                current={this.current}
                onFocusout={() => (this.openMenu = undefined)}
              />
              {index < this.items.length - 1 && <li role="separator"></li>}
            </Fragment>
          ))}
          <li
            class="searchbar-container"
            role="none"
          >
            <form
              class={{ 'searchbar': true, 'searchbar-open': this.showSearchbar }}
              role="search"
              aria-label="Cerca"
              method="get"
              action="/ricerca"
              onSubmit={(event) => this.onSearchSubmit(event)}
              ref={(el) => (this.formElement = el)}
            >
              {this.showSearchbar && (
                <input
                  id="searchbar-input"
                  name="q"
                  type="search"
                  placeholder="Cerca per parola chiave o ISBN"
                  onInput={(event) => this.handleInputChange(event)}
                ></input>
              )}
              <button
                class="searchbar-button"
                aria-controls="searchbar-input"
                type={this.showSearchbar ? 'submit' : 'button'}
                onClick={() => (this.showSearchbar = true)}
              >
                {this.showSearchbar ? null : <span>Cerca</span>}
                <z-icon
                  name="search"
                  width="32"
                  height="32"
                ></z-icon>
              </button>
            </form>
          </li>
        </ul>

        {this.items.map(
          (item) =>
            item.navbarItems?.length && (
              <nav class={{ 'sub-menubar': true, 'visible': this.isActive(item) }}>
                <ul
                  role="menubar"
                  onKeyDown={(event) => this.handleMenuKeydown(event)}
                >
                  {item.navbarItems.map((subitem) => (
                    <Fragment>
                      <li role="none">
                        <a
                          class={{ 'menubar-item': true, 'active': this.isActive(subitem) }}
                          href={subitem.href}
                          id={subitem.id}
                          role="menuitem"
                          tabIndex={-1}
                          aria-haspopup={subitem.menuItems?.length ? 'true' : 'false'}
                          aria-expanded={this.openMenu === subitem.id ? 'true' : 'false'}
                          aria-current={this.current === item.id ? 'page' : 'false'}
                          onPointerOver={() => this.openFloatingMenu(subitem)}
                          onKeyDown={(event) => this.handleItemKeydown(event, subitem)}
                        >
                          <span>{subitem.label}</span>
                          {subitem.menuItems?.length > 0 && (
                            <z-icon name={this.openMenu === subitem.id ? 'chevron-up' : 'chevron-down'} />
                          )}
                        </a>
                      </li>
                      <Menu
                        controlledBy={subitem.id}
                        open={this.openMenu === subitem.id}
                        items={subitem.menuItems}
                        current={this.current}
                        onFocusout={() => (this.openMenu = undefined)}
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
