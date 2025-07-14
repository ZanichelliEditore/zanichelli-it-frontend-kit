import { Component, Element, Event, EventEmitter, h, Listen, Prop, State, Watch } from '@stencil/core';
import { containsTarget } from '../../../utils/utils';

@Component({
  tag: 'zanit-search-form',
  styleUrl: 'search-form.css',
  shadow: true,
})
export class ZanitSearchForm {
  private formElement: HTMLFormElement;

  @Element() host: HTMLZanitSearchFormElement;

  @State()
  isMobile: boolean = false;

  /** Indicates whether the searchbar is visible and usable. */
  @State()
  showSearchbar: boolean = false;

  /** Search query to apply. */
  @State()
  _searchQuery: string | undefined = undefined;

  /** Initial search query */
  @Prop({ mutable: true })
  searchQuery: string | undefined = undefined;

  @Watch('searchQuery')
  onSearchQueryChange() {
    this._searchQuery = this.searchQuery;
    if (this.searchQuery) {
      this.openSearchbar();
    }
  }

  /** Emitted on search form submission. */
  @Event({ cancelable: true }) search: EventEmitter<{ query: string }>;

  @Event() resetSearch: EventEmitter<void>;

  async connectedCallback() {
    this.showSearchbar = !!this.searchQuery;
    const mobileMediaQuery = window.matchMedia('(width < 768px)');
    this.isMobile = mobileMediaQuery.matches;
    mobileMediaQuery.onchange = (mql) => {
      this.isMobile = mql.matches;
    };
  }

  /** Close open searchbar when clicking outside. */
  @Listen('click', { target: 'document', passive: true })
  handleOutsideClick(event: MouseEvent) {
    if (this.showSearchbar && this.formElement && !containsTarget(this.formElement, event)) {
      this.showSearchbar = false;
    }
  }

  private openSearchbar() {
    this.showSearchbar = true;
    setTimeout(() => {
      const searchbarInput = this.host.shadowRoot.querySelector('#searchbar-input') as HTMLInputElement;
      searchbarInput.focus();
    }, 100);
  }

  private resetSearchQuery() {
    this.searchQuery = undefined;
    this.resetSearch.emit();
  }

  private handleInputChange(event: Event) {
    this._searchQuery = (event.target as HTMLInputElement).value;
    if (!this._searchQuery) {
      this.searchQuery = undefined;
    }
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (!this._searchQuery) {
      return;
    }

    this.showSearchbar = false;
    const searchEv = this.search.emit({ query: this._searchQuery });
    // do not submit the form if the event default behavior was prevented
    if (searchEv.defaultPrevented) {
      return;
    }

    this.formElement.submit();
  }

  render() {
    if (this.isMobile) {
      return (
        <form
          class="searchbar"
          ref={(el) => (this.formElement = el)}
          role="search"
          aria-label="Cerca"
          method="get"
          action="/ricerca"
          onSubmit={(event) => this.onSearchSubmit(event)}
          onReset={() => this.resetSearchQuery()}
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
      );
    }

    return (
      <form
        class={{ 'searchbar': true, 'searchbar-open': this.showSearchbar }}
        ref={(el) => (this.formElement = el)}
        role="search"
        aria-label="Cerca"
        method="get"
        action="/ricerca"
        onSubmit={(event) => this.onSearchSubmit(event)}
        onReset={() => this.resetSearchQuery()}
      >
        <div
          class={{ 'hide': !this.showSearchbar, 'input-wrapper': true }}
          role="none"
        >
          {this.searchQuery && (
            <button
              type="reset"
              aria-label="Svuota campo di ricerca"
            >
              <z-icon
                name="multiply-circled"
                width="1.5rem"
                height="1.5rem"
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
        </div>

        <button
          class="searchbar-button"
          aria-label="Cerca"
          aria-controls="searchbar-input"
          type={this.showSearchbar ? 'submit' : 'button'}
          onClick={() => this.openSearchbar()}
        >
          {this.showSearchbar ? null : <span class="searchbar-button-label">Cerca</span>}
          <z-icon
            name="search"
            width="2rem"
            height="2rem"
          ></z-icon>
        </button>
      </form>
    );
  }
}
