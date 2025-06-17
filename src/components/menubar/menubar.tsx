import { Component, Element, Fragment, Listen, Prop, State, Watch, h } from '@stencil/core';
import { MenubarItem } from '../../utils/types';
import { containsTarget, moveFocus } from '../../utils/utils';
import { Menu } from './menu/menu';

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
  @Element() host: HTMLZanitMenubarElement;

  /** Menubar items extracted from `data`. */
  @State()
  items: MenubarItem[] = [];

  /** ID of the currently open menu. */
  @State()
  openMenu: string | undefined = undefined;

  /** ID of the item to show the subitems navbar for. */
  @State()
  openNavbar: string | undefined = undefined;

  @State()
  isMobile: boolean = false;

  @State()
  loading: boolean = false;

  /** The data to build the menu (as an array of `MenubarItem` or a JSON array) or the url to fetch to retrieve it. */
  @Prop()
  data: Promise<MenubarItem[]> | MenubarItem[] | URL | string;

  /** ID of the current active item. */
  @Prop()
  current: string | undefined = undefined;

  /**
   * Delay in milliseconds before closing the menu after a mouseout event.
   * Useful to avoid immediate closing when the pointer briefly leaves the component.
   */
  @Prop()
  mouseOutTimeout: number | undefined = 1000;

  /** Initial search query. */
  @Prop({ mutable: true })
  searchQuery: string | undefined = undefined;

  private timerId: number;

  /** Setup the list of items. */
  @Watch('data')
  async parseData(data: typeof this.data) {
    if (!data) {
      return;
    }

    if (data instanceof URL) {
      this.items = await this.fetchData(data);
    } else if (data instanceof Promise) {
      this.loading = true;
      this.items = await data;
      this.loading = false;
    } else if (typeof data === 'string') {
      try {
        this.items = JSON.parse(data);
        if (!Array.isArray(this.items) || !this.items?.every((item) => item satisfies MenubarItem)) {
          throw new Error('Expected an array of MenubarItem objects.');
        }
      } catch {
        let url: URL;
        try {
          url = new URL(data);
        } catch {
          throw new Error('Invalid string provided for `data` property: not a valid url or JSON.');
        }

        this.items = await this.fetchData(url);
      }
    } else if (Array.isArray(data) && data.every((item) => item satisfies MenubarItem)) {
      this.items = data;
    } else {
      throw new Error(
        'Invalid `data` property value. Expected an url, a JSON or an array/promise of MenubarItem objects.'
      );
    }
  }

  @Watch('items')
  onItemsChange() {
    this.initTabindex();
  }

  async connectedCallback() {
    const mobileMediaQuery = window.matchMedia('(width < 768px)');
    this.isMobile = mobileMediaQuery.matches;
    mobileMediaQuery.onchange = (mql) => {
      this.isMobile = mql.matches;
      this.initTabindex();
      this.openMenu = undefined;
    };
    await this.parseData(this.data);
    this.initTabindex();
  }

  /** Close any open menu when clicking outside. */
  @Listen('click', { target: 'document', passive: true })
  handleOutsideClick(event: MouseEvent) {
    if (!this.openMenu || containsTarget(this.host, event)) {
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

  @Listen('mouseover', { passive: true })
  handleMouseover() {
    clearTimeout(this.timerId);
  }

  @Listen('mouseout', { passive: true })
  handleMouseout(event: MouseEvent) {
    this.timerId = setTimeout((_e) => {
      if (!this.openMenu || containsTarget(this.host, event)) {
        return;
      }

      this.openMenu = undefined;
    }, this.mouseOutTimeout);
  }

  /** Close the menu when it loses focus. */
  @Listen('focusout', { passive: true })
  handleFocusout(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!this.openMenu || this.host.shadowRoot.querySelector('.menu')?.contains(relatedTarget)) {
      return;
    }

    this.openMenu = undefined;
  }

  /** Fetch data from passed URL. */
  private async fetchData(url: URL) {
    try {
      this.loading = true;
      const data = await (await fetch(url)).json();
      this.loading = false;
      if (!Array.isArray(data) || !data.every((item) => item satisfies MenubarItem)) {
        throw new Error('Invalid data structure. Expected an array of MenuItem objects.');
      }

      return data as MenubarItem[];
    } catch (error) {
      this.loading = false;
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
    const itemElement = event.target as HTMLElement;
    const items = Array.from(
      itemElement.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]') ?? []
    ) as HTMLElement[];
    const currentIndex = items.indexOf(itemElement);
    switch (event.key) {
      case 'ArrowUp': {
        event.preventDefault();
        event.stopPropagation();
        const prevItem = items[currentIndex - 1] || items[items.length - 1];
        moveFocus(itemElement, prevItem);
        break;
      }
      // Move the focus to the first item of the next group if any, otherwise move it to the next menubar item
      case 'ArrowRight': {
        event.preventDefault();
        event.stopPropagation();
        const currentGroup = itemElement.closest('[role=group]') as HTMLElement;
        const nextGroup = this.getNextGroup(currentGroup);
        if (!nextGroup) {
          itemElement.tabIndex = -1;
          const menuTriggerId = itemElement.closest('[role="menu"][aria-labelledby]').getAttribute('aria-labelledby');
          const focusedItem = this.host.shadowRoot.getElementById(menuTriggerId);
          this.focusNextItem(focusedItem);
          break;
        }

        const nextGroupItems = (nextGroup.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
        moveFocus(itemElement, nextGroupItems[0]);
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        event.stopPropagation();
        const nextItem = items[currentIndex + 1] || items[0];
        moveFocus(itemElement, nextItem);
        break;
      }
      // Move the focus to the first item of the previous group if any, otherwise move it to the previous menubar item
      case 'ArrowLeft': {
        event.preventDefault();
        event.stopPropagation();
        const currentGroup = itemElement.closest('[role=group]') as HTMLElement;
        const prevGroup = this.getPreviousGroup(currentGroup);
        if (!prevGroup) {
          itemElement.tabIndex = -1;
          const menuTriggerId = itemElement.closest('[role="menu"][aria-labelledby]').getAttribute('aria-labelledby');
          const focusedItem = this.host.shadowRoot.getElementById(menuTriggerId);
          this.focusPreviousItem(focusedItem);
          break;
        }

        const prevGroupItems = (prevGroup.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
        moveFocus(itemElement, prevGroupItems[0]);
        break;
      }
      case 'Home':
        // Move to the first menu item
        event.preventDefault();
        event.stopPropagation();
        moveFocus(itemElement, items[0]);
        break;
      case 'End':
        // Move to the last menu item
        event.preventDefault();
        event.stopPropagation();
        moveFocus(itemElement, items[items.length - 1]);
        break;
    }
  }

  render() {
    if (this.isMobile) {
      return (
        <zanit-mobile-menubar
          items={this.items}
          current={this.current}
          searchQuery={this.searchQuery}
          loading={this.loading}
        />
      );
    }

    return (
      <nav aria-label="Zanichelli.it">
        <div
          class="shadow-wrapper"
          role="none"
        >
          <div class="width-limiter">
            <ul
              class="menubar"
              role="menubar"
              aria-label="Zanichelli.it"
            >
              {this.loading &&
                [...new Array(4)].map((_, index) => (
                  <Fragment>
                    <li role="none">
                      <div class="menubar-item">
                        <z-ghost-loading></z-ghost-loading>
                      </div>
                    </li>
                    {index < 3 && <li role="separator"></li>}
                  </Fragment>
                ))}
              {this.items?.map((item, index) => (
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
                        <z-icon
                          name={this.openMenu === item.id ? 'chevron-up' : 'chevron-down'}
                          width="0.875rem"
                          height="0.875rem"
                        />
                      )}
                    </a>
                  </li>
                  {index < this.items?.length - 1 && <li role="separator"></li>}
                </Fragment>
              ))}
            </ul>
            <zanit-search-form
              searchQuery={this.searchQuery}
              onResetSearch={() => (this.searchQuery = undefined)}
            />
          </div>

          {this.items.map(
            (item) =>
              this.openMenu === item.id && (
                <Menu
                  controlledBy={item.id}
                  items={item.menuItems}
                  current={this.current}
                  onItemKeyDown={(event) => this.handleMenuKeydown(event)}
                />
              )
          )}
        </div>

        {this.items?.map(
          (item) =>
            item.navbarItems?.length && (
              <nav class={{ 'sub-menubar': true, 'shadow-wrapper': true, 'visible': this.isActive(item) }}>
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
                            <z-icon
                              name={this.openMenu === subitem.id ? 'chevron-up' : 'chevron-down'}
                              width="0.75rem"
                              height="0.75rem"
                            />
                          )}
                        </a>
                      </li>
                    </Fragment>
                  ))}
                </ul>
                {item.navbarItems.map(
                  (subitem) =>
                    this.openMenu === subitem.id && (
                      <Menu
                        controlledBy={subitem.id}
                        items={subitem.menuItems}
                        current={this.current}
                        onItemKeyDown={(event) => this.handleMenuKeydown(event)}
                      />
                    )
                )}
              </nav>
            )
        )}
      </nav>
    );
  }
}
