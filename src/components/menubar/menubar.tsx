import { Component, Element, Event, EventEmitter, Fragment, Listen, Prop, State, Watch, h } from '@stencil/core';
import { Menu } from './menu/menu';
import { containsTarget, moveFocus } from '../../utils/utils';

export type MenuItem = {
  label: string;
  href?: string;
  highlight?: boolean;
  id?: string;
  group?: { id: string; label: string };
};
export type MenubarItem = Omit<MenuItem, 'group'> & {
  navbarItems?: MenubarItem[];
  menuItems?: MenuItem[];
};

/**
 * Main menubar component. Each item can have a menu with subitems
 * When a main menubar item is the current active one, a sub-menubar is shown and each subitem can have a menu with subitems.
 * @cssprop {--zanit-menubar-max-width} Maximum width of the menubar.
 */
@Component({
  tag: 'zanit-menubar',
  styleUrls: ['menubar.css', 'menu/menu.css'],
  shadow: true,
})
export class ZanitMenubar {
  private formElement: HTMLFormElement;

  @Element() host: HTMLZanitMenubarElement;

  /** Menubar items extracted from `data`. */
  @State() items: MenubarItem[] = [];

  /** ID of the currently open menu. */
  @State() openMenu: string | undefined = undefined;

  /** ID of the item to show the subitems navbar for. */
  @State() openNavbar: string | undefined = undefined;

  /** Indicates whether the searchbar is visible and usable. */
  @State() showSearchbar: boolean = false;

  /** Search query to apply. */
  @State() _searchQuery: string | undefined = undefined;

  @State() isMobile: boolean = false;

  /** The data to build the menu (as an array of `MenuItem` or a JSON array) or the url to fetch to retrieve it. */
  @Prop() data: Promise<MenubarItem[]> | MenubarItem[] | URL | string;

  /** ID of the current active item. */
  @Prop() current: string | undefined = undefined;

  /** Initial search query. */
  @Prop() searchQuery: string | undefined = undefined;

  /** Setup the list of items. */
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

  @Watch('items')
  onItemsChange() {
    this.initTabindex();
  }

  /** Focus searchbar input when it becomes visible. */
  @Watch('showSearchbar')
  onShowSearchbar() {
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

  /** Emitted on search form submission. */
  @Event() search: EventEmitter<{ query: string }>;

  async connectedCallback() {
    await this.parseData(this.data);
    this.initTabindex();
    const mobileMediaQuery = window.matchMedia('(width < 768px)');
    this.isMobile = mobileMediaQuery.matches;
    mobileMediaQuery.onchange = (mql) => {
      this.isMobile = mql.matches;
      this.initTabindex();
      this.openMenu = undefined;
      this.showSearchbar = false;
    };
  }

  /** Close open searchbar or any open menu when clicking outside. */
  @Listen('pointerdown', { target: 'document', passive: true })
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
  @Listen('keydown', { passive: true })
  handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
      case 'Tab':
        this.openMenu = undefined;
        break;
    }
  }

  /** Close the menu when it loses focus. */
  @Listen('focusout', { passive: true })
  handleFocusout(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (this.host.shadowRoot.querySelector('.menu')?.contains(relatedTarget)) {
      return;
    }

    this.openMenu = undefined;
  }

  /** Fetch data from passed URL. */
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

  /** Initialize tabindex on menuitems of menubars, setting -1 to all but the first one. */
  private initTabindex() {
    setTimeout(() => {
      this.host.shadowRoot.querySelectorAll('[role="menubar"]')?.forEach((menubar) => {
        menubar
          .querySelectorAll('[role="menuitem"]')
          ?.forEach((item, index) => item.setAttribute('tabindex', index === 0 ? '0' : '-1'));
      });
    }, 100);
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

  /** Opens the menu associated with the menubar `item`, if any. */
  private showMenu(item: MenubarItem) {
    if (!item.menuItems?.length) {
      return;
    }

    this.openMenu = item.id;
  }

  /** Get all elements with `menuitem` role inside parent's `menubar`. * */
  private getParentMenubarElements(itemEl: HTMLElement) {
    return Array.from(
      itemEl?.closest('[role="menubar"]')?.querySelectorAll(':scope > li a[role="menuitem"]') ?? []
    ) as HTMLElement[];
  }

  /** Move the focus to the previous menubar item, or the last one. Then open its menu if any other menu was open. */
  private focusPreviousItem(itemEl: HTMLElement) {
    const menubarElements = this.getParentMenubarElements(itemEl);
    itemEl.tabIndex = -1;
    const currentIndex = menubarElements.indexOf(itemEl);
    const prevItem = menubarElements[(currentIndex - 1 + menubarElements.length) % menubarElements.length]; // get previous item or last one
    prevItem.tabIndex = 0;
    prevItem.focus();
    // open the item's menu if any other menu was open
    if (prevItem.ariaHasPopup === 'true' && this.openMenu) {
      this.openMenu = prevItem.id;
    }
  }

  /** Move the focus to the next menubar item, or the first one. Then open its menu if any other menu was open. */
  private focusNextItem(itemEl: HTMLElement) {
    const menubarElements = this.getParentMenubarElements(itemEl);
    itemEl.tabIndex = -1;
    const currentIndex = menubarElements.indexOf(itemEl);
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
    const target = event.target as HTMLElement;
    switch (event.key) {
      case 'Home': {
        event.preventDefault();
        event.stopPropagation();
        const firstItem = this.getParentMenubarElements(target)[0];
        moveFocus(target, firstItem);
        break;
      }
      case 'End': {
        event.preventDefault();
        event.stopPropagation();
        const lastItem = this.getParentMenubarElements(target).pop();
        moveFocus(target, lastItem);
        break;
      }
      case 'ArrowUp': {
        if (!item.menuItems?.length) {
          break;
        }
        event.preventDefault();
        event.stopPropagation();
        this.openMenu = item.id;
        // focus last item of the menu
        setTimeout(() => {
          const menuItems = Array.from(
            this.host.shadowRoot.querySelectorAll(`[aria-labelledby=${item.id}] [role="menuitem"]`)
          ) as HTMLElement[];
          moveFocus(target, menuItems[menuItems.length - 1]);
        }, 100);
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        event.stopPropagation();
        this.focusNextItem(target);
        break;
      }
      case 'ArrowDown': {
        if (!item.menuItems?.length) {
          break;
        }
        this.openMenu = item.id;
        setTimeout(() => {
          // focus first item of the menu
          const firsMenuItem = this.host.shadowRoot.querySelector(
            `[aria-labelledby=${item.id}] [role="menuitem"]`
          ) as HTMLElement;
          firsMenuItem.tabIndex = 0;
          firsMenuItem.focus();
        }, 100);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        event.stopPropagation();
        this.focusPreviousItem(target);
        break;
      }
    }
  }

  /** Get the previous element with `role=group`. */
  private getPreviousGroup(groupContainer: HTMLElement) {
    const groups = Array.from(
      groupContainer?.closest('[role="menu"]')?.querySelectorAll('[role="group"]') ?? []
    ) as HTMLElement[];
    const currentIndex = groups.indexOf(groupContainer);

    return groups[currentIndex - 1];
  }

  /** Get the next element with `role=group`. */
  private getNextGroup(groupContainer: HTMLElement) {
    const groups = Array.from(
      groupContainer?.closest('[role="menu"]')?.querySelectorAll('[role="group"]') ?? []
    ) as HTMLElement[];
    const currentIndex = groups.indexOf(groupContainer);

    return groups[currentIndex + 1];
  }

  /** Handles keyboard navigation events from `Menu` component. */
  private handleMenuKeydown(event: KeyboardEvent) {
    const menuItem = event.target as HTMLElement;
    const items = Array.from(
      menuItem.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]') ?? []
    ) as HTMLElement[];
    const currentIndex = items.indexOf(menuItem);
    switch (event.key) {
      case 'ArrowUp': {
        event.preventDefault();
        event.stopPropagation();
        const prevItem = items[currentIndex - 1] || items[items.length - 1];
        moveFocus(menuItem, prevItem);
        break;
      }
      // Move the focus to the first item of the next group if any, otherwise move it to the next menubar item
      case 'ArrowRight': {
        event.preventDefault();
        event.stopPropagation();
        const currentGroup = menuItem.closest('[role=group]') as HTMLElement;
        const nextGroup = this.getNextGroup(currentGroup);
        if (!nextGroup) {
          menuItem.tabIndex = -1;
          const parentMenubar = (event.target as HTMLElement).closest('[role="menubar"]');
          const focusedItem = parentMenubar?.querySelector<HTMLElement>(
            '[role="menuitem"][aria-expanded="true"][tabindex="0"]'
          );
          this.focusNextItem(focusedItem);
          break;
        }

        const nextGroupItems = (nextGroup.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
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
      // Move the focus to the first item of the previous group if any, otherwise move it to the previous menubar item
      case 'ArrowLeft':
        event.preventDefault();
        event.stopPropagation();
        const currentGroup = menuItem.closest('[role=group]') as HTMLElement;
        const prevGroup = this.getPreviousGroup(currentGroup);
        if (!prevGroup) {
          menuItem.tabIndex = -1;
          const parentMenubar = (event.target as HTMLElement).closest('[role="menubar"]');
          const focusedItem = parentMenubar?.querySelector<HTMLElement>(
            '[role="menuitem"][aria-expanded="true"][tabindex="0"]'
          );
          this.focusPreviousItem(focusedItem);
          break;
        }

        const prevGroupItems = (prevGroup.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
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
  }

  private handleInputChange(event: Event) {
    this._searchQuery = (event.target as HTMLInputElement).value;
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (!this._searchQuery) {
      return;
    }

    this.search.emit({ query: this._searchQuery });
    this.formElement.submit();
  }

  render() {
    if (!this.items?.length) {
      return;
    }

    if (this.isMobile) {
      return (
        <zanit-mobile-menubar
          items={this.items}
          current={this.current}
          searchQuery={this.searchQuery}
        />
      );
    }

    return (
      <nav aria-label="Zanichelli.it">
        <ul
          class="menubar"
          role="menubar"
          aria-label="Zanichelli.it"
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
                  onPointerOver={() => this.showMenu(item)}
                  onKeyDown={(event) => this.handleItemKeydown(event, item)}
                >
                  <span data-text={item.label}>{item.label}</span>
                  {item.menuItems?.length > 0 && (
                    <z-icon name={this.openMenu === item.id ? 'chevron-up' : 'chevron-down'} />
                  )}
                </a>
              </li>
              {this.openMenu === item.id && (
                <Menu
                  controlledBy={item.id}
                  items={item.menuItems}
                  current={this.current}
                  onItemKeyDown={(event) => this.handleMenuKeydown(event)}
                />
              )}
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
                  required
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
                <ul role="menubar">
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
                          onPointerOver={() => this.showMenu(subitem)}
                          onKeyDown={(event) => this.handleItemKeydown(event, subitem)}
                        >
                          <span>{subitem.label}</span>
                          {subitem.menuItems?.length > 0 && (
                            <z-icon name={this.openMenu === subitem.id ? 'chevron-up' : 'chevron-down'} />
                          )}
                        </a>
                      </li>
                      {this.openMenu === subitem.id && (
                        <Menu
                          controlledBy={subitem.id}
                          items={subitem.menuItems}
                          current={this.current}
                          onItemKeyDown={(event) => this.handleMenuKeydown(event)}
                        />
                      )}
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
