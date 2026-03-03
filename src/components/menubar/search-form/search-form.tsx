import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State, Watch } from '@stencil/core';
import { containsTarget } from '../../../utils';
import { getSubjectsByArea, SearchEnv } from '../../../utils/subjects.api';
import { buildSuggestions, SearchSuggestion } from './suggestions';

@Component({
  tag: 'zanit-search-form',
  styleUrl: 'search-form.css',
  shadow: true,
})
export class ZanitSearchForm {
  private formElement: HTMLFormElement;
  private subjectsByArea: Record<string, string[]> = {};
  private timer: NodeJS.Timeout;

  @Element() host: HTMLZanitSearchFormElement;

  /** Indicates whether the searchbar is visible and usable. */
  @State()
  showSearchbar: boolean = false;

  /** Search query to apply. */
  @State()
  _searchQuery: string | undefined = undefined;

  /** Search suggestions to show in the autocomplete dropdown. */
  @State() suggestions: SearchSuggestion[] = [];

  /** Initial search query */
  @Prop({ mutable: true })
  searchQuery: string | undefined = undefined;

  /** The currently active area (e.g. "SCUOLA", "UNIVERSITÀ", "DIZIONARI").  */
  @Prop() searchArea?: string | undefined;

  /** Environment for which to retrieve the suggestions categories for search */
  @Prop() searchEnv?: SearchEnv | undefined;

  @Watch('searchQuery')
  onSearchQueryChange() {
    this._searchQuery = this.searchQuery;
    if (this.searchQuery) {
      this.openSearchbar();
    }
  }

  @Watch('showSearchbar')
  onShowSearchbarChange() {
    if (this.showSearchbar) {
      this.updateSuggestions(this._searchQuery ?? '');
    } else {
      console.log('reset suggestions');
      this.suggestions = [];
    }
  }

  /** Emitted on search form submission. */
  @Event({ cancelable: true }) search: EventEmitter<{ query: string; area?: string }>;

  @Event() resetSearch: EventEmitter<void>;

  /** Emitted when a suggestion is clicked. */
  @Event({ cancelable: true })
  suggestionClicked: EventEmitter<{ user_query: string; query?: string; area?: string; subject?: string }>;

  async connectedCallback() {
    this.showSearchbar = !!this.searchQuery;
    this._searchQuery = this.searchQuery;
    if (this.searchEnv) this.subjectsByArea = await getSubjectsByArea(this.searchEnv);
  }

  /** Close open searchbar when clicking outside. */
  @Listen('click', { target: 'document', passive: true })
  handleOutsideClick(event: MouseEvent) {
    if (this.showSearchbar && this.host && !containsTarget(this.host, event)) {
      this.showSearchbar = false;
    }
  }

  /** Close the menu when pressing Escape or Tab. */
  @Listen('keydown', { passive: true })
  handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        this.showSearchbar = false;
        break;
      case 'Tab':
        if (containsTarget(this.host, event)) {
          break;
        }

        this.showSearchbar = false;
        break;
    }
  }

  private openSearchbar() {
    this.showSearchbar = true;
    setTimeout(() => {
      const searchbarInput = this.host.shadowRoot.querySelector('#searchbar-input') as HTMLInputElement;
      searchbarInput.focus({ preventScroll: true });
    }, 500);
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
    this.updateSuggestions(this._searchQuery);
  }

  private updateSuggestions(query: string) {
    clearTimeout(this.timer);
    if (query.trim().length < 3) {
      return;
    }

    this.timer = setTimeout(() => {
      this.suggestions = buildSuggestions(query.trim(), this.subjectsByArea, this.searchArea?.toUpperCase());

      console.group('%cSearch Suggestions', 'color: #7570d1; font-weight: bold;');
      console.log(this.suggestions);
      console.groupEnd();
    }, 300);
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (!this._searchQuery) {
      return;
    }

    this.showSearchbar = false;
    const searchEv = this.search.emit({ query: this._searchQuery, area: this.searchArea });
    // do not submit the form if the event default behavior was prevented
    if (searchEv.defaultPrevented) {
      return;
    }

    this.formElement.submit();
  }

  private renderSuggestions() {
    if (!this.suggestions.length) {
      return null;
    }

    return (
      <div class="suggestions">
        {this.suggestions.map((suggestion, k) => (
          <span
            key={k}
            innerHTML={suggestion.label}
            onClick={() => {
              const ev = this.suggestionClicked.emit(suggestion);
              if (!ev.defaultPrevented) {
                window.location.href = suggestion.url;
              }
            }}
          />
        ))}
      </div>
    );
  }

  render() {
    return (
      <Host>
        <form
          class={{ 'searchbar': true, 'searchbar-open': this.showSearchbar }}
          ref={(el) => (this.formElement = el)}
          role="search"
          aria-label="Cerca nel sito"
          method="get"
          action="/ricerca"
          onSubmit={(event) => this.onSearchSubmit(event)}
          onReset={() => this.resetSearchQuery()}
        >
          <div
            class="input-wrapper"
            role="none"
          >
            {this.searchQuery && (
              <button
                type="reset"
                aria-label="Svuota campo di ricerca"
                disabled={!this.showSearchbar}
              >
                <z-icon name="multiply-circled" />
              </button>
            )}
            <input
              id="searchbar-input"
              name="q"
              type="search"
              disabled={!this.showSearchbar}
              placeholder="Cerca per parola chiave o ISBN"
              onInput={(event) => this.handleInputChange(event)}
              value={this.searchQuery}
              required
              autocomplete="off"
            ></input>
          </div>

          <button
            class="searchbar-button"
            aria-label="Esegui ricerca"
            aria-controls="searchbar-input"
            type={this.showSearchbar ? 'submit' : 'button'}
            onClick={() => this.openSearchbar()}
          >
            {this.showSearchbar ? null : <span class="searchbar-button-label">Cerca</span>}
            <z-icon name="search"></z-icon>
          </button>
        </form>
        <div class="suggestions-wrapper">{this.renderSuggestions()}</div>
      </Host>
    );
  }
}
