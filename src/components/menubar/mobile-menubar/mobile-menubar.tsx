import { Component, Element, Event, EventEmitter, h, Listen, Prop, State, Watch } from '@stencil/core';
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
  private formElement: HTMLFormElement;

  @Element() host: HTMLZanitMobileMenubarElement;

  /** ID of the current active item. */
  @Prop() current: string | undefined = undefined;

  /** Menubar items. */
  @Prop() items: MenubarItem[] = [];

  /** Initial search query. */
  @Prop({ mutable: true }) searchQuery: string | undefined = undefined;

  /** Whether the menubar is loading the data. */
  @Prop() loading: boolean = false;

  @State() parentItem: MenubarItem | undefined = undefined;
  @State() menuItems: MenubarItem[] | MenuItem[] | undefined = undefined;
  /** Whether the items to render come from a menubar or a menu. */
  @State() menuType: 'menubar' | 'menu' | undefined = undefined;
  @State() open: boolean;

  /** Search query to apply. */
  @State() _searchQuery: string | undefined = undefined;

  @Watch('items')
  @Watch('current')
  onItemsChange() {
    this.setupData(this.items);
  }

  /**
   * Find the current item and take its parent, `menuItems` or the `navbarItems`.
   * @returns True if an item matches the `current` prop, false otherwise.
   */
  private setupData(items: MenubarItem[], parent?: MenubarItem): boolean {
    for (const item of items) {
      if (item.id === this.current) {
        const type = item.menuItems?.length ? 'menu' : 'menubar';
        this.parentItem = parent;
        this.menuType = type;
        this.menuItems = item.menuItems || item.navbarItems;
        return true;
      }

      if (item.menuItems?.some(({ id }) => id === this.current)) {
        this.parentItem = parent;
        this.menuType = 'menu';
        this.menuItems = item.menuItems;
        return true;
      }

      if (item.navbarItems?.length) {
        return this.setupData(item.navbarItems, item);
      }
    }

    return false;
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

  private handleInputChange(event: Event) {
    this._searchQuery = (event.target as HTMLInputElement).value;
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (!this._searchQuery) {
      return;
    }

    const searchEv = this.search.emit({ query: this._searchQuery });
    // do not submit the form if the event default behavior was prevented
    if (searchEv.defaultPrevented) {
      return;
    }

    this.formElement.submit();
  }

  /** Emitted on search form submission. */
  @Event() search: EventEmitter<{ query: string }>;

  connectedCallback() {
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
              <form
                class="searchbar"
                ref={(el) => (this.formElement = el as HTMLFormElement)}
                role="search"
                aria-label="Cerca"
                method="get"
                action="/ricerca"
                onSubmit={(event) => this.onSearchSubmit(event)}
                onReset={() => (this.searchQuery = undefined)}
              >
                {this.searchQuery && (
                  <button
                    type="reset"
                    aria-label="Svuota campo di ricerca"
                  >
                    <z-icon
                      name="multiply-circled"
                      width="1rem"
                      height="1rem"
                    />
                  </button>
                )}
                <input
                  id="searchbar-input"
                  name="q"
                  type="search"
                  placeholder="Cerca per parola chiave o ISBN"
                  onInput={(event) => this.handleInputChange(event)}
                  value={this.searchQuery}
                  required
                ></input>
                <button
                  class="searchbar-button"
                  aria-controls="searchbar-input"
                  aria-label="Cerca"
                  type="submit"
                >
                  <z-icon
                    name="search"
                    width="1.25rem"
                    height="1.25rem"
                  ></z-icon>
                </button>
              </form>
            </li>

            {!this.loading && this.current && (
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
                current={this.current}
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
                        aria-current={this.current === item.id ? 'page' : 'false'}
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
