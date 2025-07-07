import { Component, Element, h, Listen, Prop, State, Watch } from '@stencil/core';
import { MenubarItem, MenuItem } from '../../../utils/types';
import { containsTarget, moveFocus } from '../../../utils/utils';
import { Menu } from '../menu/menu';

/** Mobile menubar component. */
@Component({
  tag: 'zanit-mobile-menubar',
  styleUrls: ['mobile-menubar.css', '../menu/menu.css'],
  shadow: true,
})
export class ZanitMobileMenubar {
  @Element() host: HTMLZanitMobileMenubarElement;

  /** IDs path of the current item. */
  @Prop() currentPath: string[] = [];

  /** Menubar items. */
  @Prop() items: MenubarItem[] = [];

  /** Initial search query. */
  @Prop({ mutable: true }) searchQuery: string | undefined = undefined;

  /** Whether the menubar is loading the data. */
  @Prop() loading: boolean = false;

  /** Last active item ID. */
  @State() lastCurrent: string | undefined = undefined;
  @State() parentItem: MenubarItem | undefined = undefined;
  @State() menuItems: MenubarItem[] | MenuItem[] | undefined = undefined;
  /** Whether the items to render come from a menubar or a menu. */
  @State() menuType: 'menubar' | 'menu' | undefined = undefined;
  @State() open: boolean;

  @Watch('items')
  @Watch('currentPath')
  onItemsChange() {
    this.lastCurrent = this.currentPath?.length ? this.currentPath[this.currentPath.length - 1] : undefined;
    this.setupData(this.items);
  }

  /**
   * Find the current item and take its parent, `menuItems` or the `navbarItems`.
   */
  private setupData(items: MenubarItem[], parent?: MenubarItem) {
    for (const item of items) {
      if (item.id === this.lastCurrent) {
        this.parentItem = parent;
        this.menuType = item.menuItems?.length ? 'menu' : 'menubar';
        this.menuItems = item.menuItems || item.navbarItems;
        return;
      }

      if (
        this.currentPath.length > 1 &&
        item.id === this.currentPath[this.currentPath.length - 2] &&
        item.menuItems?.some(({ id }) => id === this.lastCurrent)
      ) {
        this.parentItem = item;
        this.menuType = item.menuItems?.length ? 'menu' : 'menubar';
        this.menuItems = item.menuItems || item.navbarItems;
        return;
      }

      if (item.navbarItems?.length) {
        this.setupData(item.navbarItems, item);
      }
    }
  }

  private get menuItemsElement() {
    return Array.from(this.host.shadowRoot.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
  }

  /** Initialize tabindex on menuitems, setting -1 to all but the first one. */
  private initTabindex() {
    this.menuItemsElement.forEach((item, index) => item.setAttribute('tabindex', index === 0 ? '0' : '-1'));
  }

  private toggleMenu() {
    if (this.open) {
      this.open = false;
    } else {
      this.open = true;
      setTimeout(() => {
        this.initTabindex();
        this.menuItemsElement[0]?.focus();
      }, 200);
    }
  }

  /** Handles keyboard navigation on mobile menu. */
  private handleItemKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp': {
        event.preventDefault();
        event.stopPropagation();
        const items = this.menuItemsElement;
        const currentIndex = items.indexOf(event.target as HTMLElement);
        const prevItem = items[(currentIndex - 1 + items.length) % items.length];
        moveFocus(items[currentIndex], prevItem);
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        event.stopPropagation();
        const items = this.menuItemsElement;
        const currentIndex = items.indexOf(event.target as HTMLElement);
        const nextItem = items[(currentIndex + 1) % items.length];
        moveFocus(items[currentIndex], nextItem);
        break;
      }
      case 'Home': {
        event.preventDefault();
        event.stopPropagation();
        moveFocus(event.target as HTMLElement, this.menuItemsElement[0]);
        break;
      }
      case 'End': {
        event.preventDefault();
        event.stopPropagation();
        moveFocus(event.target as HTMLElement, this.menuItemsElement.pop());
        break;
      }
    }
  }

  connectedCallback() {
    this.lastCurrent = this.currentPath?.length ? this.currentPath[this.currentPath.length - 1] : undefined;
    this.setupData(this.items);
  }

  /** Close the menu when clicking outside. */
  @Listen('click', { target: 'document', passive: true })
  handleOutsideClick(event: MouseEvent) {
    if (containsTarget(this.host, event)) {
      return;
    }

    this.open = false;
  }

  /** Close the menu when pressing Escape or Tab. */
  @Listen('keydown', { passive: true })
  handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        this.open = false;
        break;
      case 'Tab':
        if (containsTarget(this.host, event)) {
          break;
        }

        this.open = false;
        break;
    }
  }

  /** Close the menu when the focus goes out. */
  @Listen('focusin', { target: 'document', passive: true })
  handleFocusout(event: FocusEvent) {
    if (containsTarget(this.host, event)) {
      return;
    }

    this.open = false;
  }

  render() {
    return (
      <nav aria-label="Zanichelli.it">
        <z-logo
          imageAlt="Logo Zanichelli"
          link="/"
          height={32}
          width={126}
        ></z-logo>
        <button
          class="burger-button"
          type="button"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-controls="mobile-menu"
          aria-label={this.open ? 'Chiudi menù' : 'Apri menù'}
          onClick={() => this.toggleMenu()}
        >
          <z-icon
            name={this.open ? 'multiply' : 'burger-menu'}
            width="1.5rem"
            height="1.5rem"
          ></z-icon>
        </button>
        {this.open && (
          <ul
            class="mobile-menu"
            role="menubar"
          >
            <li role="none">
              <zanit-search-form
                searchQuery={this.searchQuery}
                onResetSearch={() => (this.searchQuery = undefined)}
              />
            </li>

            {!this.loading && this.currentPath && this.currentPath.length > 0 && (
              <li role="none">
                <a
                  class="parent"
                  href={this.parentItem?.href ?? '/'}
                  id={this.parentItem?.id ?? undefined}
                  role="menuitem"
                  tabIndex={-1}
                  onKeyDown={(event) => this.handleItemKeydown(event)}
                >
                  <z-icon
                    name="arrow-left"
                    width="0.5rem"
                    height="0.5rem"
                  ></z-icon>
                  <span>
                    {/* Show the 'Home' label if the current item is a root child. */}
                    {this.parentItem?.label ?? 'Home'}
                  </span>
                </a>
              </li>
            )}

            {this.loading && (
              <div
                class="items-container"
                role="none"
              >
                {[...new Array(4)].map(() => (
                  <li role="none">
                    <div
                      class="menubar-item"
                      role="none"
                    >
                      <z-ghost-loading></z-ghost-loading>
                    </div>
                  </li>
                ))}
              </div>
            )}

            {this.menuType === 'menu' ? (
              <Menu
                items={this.menuItems}
                controlledBy={this.parentItem?.id}
                currentPath={this.currentPath}
                onItemKeyDown={(event) => this.handleItemKeydown(event)}
              />
            ) : (
              this.menuItems?.length && (
                <div
                  class="items-container"
                  role="none"
                >
                  {this.menuItems.map((item) => (
                    <li role="none">
                      <a
                        class={{
                          'menu-item': this.menuType === 'menu',
                          'menubar-item': this.menuType === 'menubar',
                        }}
                        href={item.href}
                        id={item.id}
                        role="menuitem"
                        aria-current={this.lastCurrent === item.id ? 'page' : 'false'}
                        tabIndex={-1}
                        onKeyDown={(event) => this.handleItemKeydown(event)}
                      >
                        <span data-text={item.label}>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </div>
              )
            )}
          </ul>
        )}
      </nav>
    );
  }
}
