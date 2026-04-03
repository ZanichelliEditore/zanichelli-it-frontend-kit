import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State, Watch } from '@stencil/core';
import { containsTarget, isArrowDownKey, isArrowUpKey, isEscKey, isTabKey, SearchEvent } from '../../../utils';
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

  /** Active suggestion - used for keyboard navigation */
  @State() activeSuggestion: string = '';

  /** Show suggestions list */
  @State() showSuggestions: boolean = false;

  /** Initial search query */
  @Prop({ mutable: true })
  searchQuery: string | undefined = undefined;

  /** Environment for search suggestions */
  @Prop() searchEnv: SearchEnv = SearchEnv.PROD;

  /** Search area (e.g. "SCUOLA", "UNIVERSITÀ", "DIZIONARI").  */
  @Prop() searchArea?: string | undefined;

  @Watch('searchQuery')
  onSearchQueryChange() {
    this._searchQuery = this.searchQuery;
    if (this.searchQuery) {
      this.openSearchbar();
    }
    this.resetSuggestions();
  }

  @Watch('searchArea')
  onSearchAreaChange() {
    this.resetSuggestions();
  }

  @Watch('showSearchbar')
  onShowSearchbarChange() {
    if (!this.showSearchbar) {
      this.showSuggestions = false;
    }
  }

  @Watch('showSuggestions')
  onShowSuggestionsChange() {
    this.activeSuggestion = '';
  }

  /** Emitted on search form submission. */
  @Event({ cancelable: true }) search: EventEmitter<SearchEvent>;

  @Event() resetSearch: EventEmitter<void>;

  async connectedCallback() {
    this.subjectsByArea = await getSubjectsByArea(this.searchEnv);
    this.showSearchbar = !!this.searchQuery;
    this._searchQuery = this.searchQuery;
  }

  /** Close open searchbar when clicking outside. */
  @Listen('click', { target: 'document', passive: true })
  handleOutsideClick(event: MouseEvent) {
    if (this.showSearchbar && this.host && !containsTarget(this.host, event)) {
      this.showSearchbar = false;
    }
  }

  /** Close the searchbar/suggestions when pressing Escape. */
  @Listen('keydown', { passive: true })
  handleEsc(event: KeyboardEvent) {
    if (!isEscKey(event)) {
      return;
    }

    if (this.showSuggestions) {
      this.showSuggestions = false;
    } else {
      this.showSearchbar = false;
    }
  }

  /** Close the searchbar/suggestions when pressing Tab. */
  @Listen('keyup', { target: 'document', passive: true })
  handleTab(event: KeyboardEvent) {
    if (!isTabKey(event)) {
      return;
    }

    this.showSuggestions = false;

    if (!containsTarget(this.host, event)) {
      this.showSearchbar = false;
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

  private resetSuggestions() {
    this.suggestions = [];
    this.showSuggestions = false;
  }

  private handleInputChange(event: InputEvent) {
    this._searchQuery = (event.target as HTMLInputElement).value;
    if (!this._searchQuery) {
      this.searchQuery = undefined;
    }

    this.updateSuggestions();
  }

  private updateSuggestions() {
    clearTimeout(this.timer);

    const query = (this._searchQuery || '').trim();

    if (query.length < 3) {
      this.resetSuggestions();
      return;
    }

    this.timer = setTimeout(() => {
      this.resetSuggestions();
      this.suggestions = buildSuggestions(query, this.subjectsByArea, this.searchArea?.toUpperCase());
      this.showSuggestions = true;
    }, 300);
  }

  private onSearchSubmit(event: Event) {
    event.preventDefault();
    if (!this._searchQuery) {
      return;
    }

    if (this.activeSuggestion) {
      const suggestion = this.suggestions.find((s) => s.id === this.activeSuggestion);
      if (suggestion) {
        this.submitSuggestionSearch(suggestion);
        this.showSuggestions = false;
        return;
      }
    }

    this.showSearchbar = false;

    const searchEv = this.search.emit({ query: this._searchQuery, area: this.searchArea });
    // do not submit the form if the event default behavior was prevented
    if (searchEv.defaultPrevented) {
      return;
    }

    this.formElement.submit();
  }

  private submitSuggestionSearch(suggestion: SearchSuggestion) {
    const ev = this.search.emit({
      user_query: suggestion.user_query,
      query: suggestion.query,
      area: suggestion.area,
      subject: suggestion.subject,
    });
    if (!ev.defaultPrevented) {
      window.location.href = suggestion.url;
    }
  }

  private handleSuggestionsNav(event: KeyboardEvent) {
    if (!isArrowDownKey(event) && !isArrowUpKey(event)) {
      return;
    }

    if (!this.suggestions.length) {
      return;
    }

    const options = this.suggestions.map((o) => o.id);

    if (!options.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!this.showSuggestions) {
      this.showSuggestions = true;
    }

    let nextId = null;
    const firstId = options[0];
    const lastId = options[options.length - 1];
    const currOption = options.indexOf(this.activeSuggestion);
    if (currOption < 0) {
      nextId = isArrowDownKey(event) ? firstId : lastId;
    } else {
      if (isArrowDownKey(event)) {
        nextId = options[currOption + 1] || lastId;
      } else {
        nextId = options[currOption - 1] || firstId;
      }
    }
    this.activeSuggestion = nextId;
  }

  private renderSuggestions() {
    const renderHeading = (label: string, key: string) => (
      <span
        key={key}
        class="suggestion-head"
        aria-hidden="true"
      >
        {label}
      </span>
    );

    return (
      <div
        class={{ 'suggestions-wrapper': true, 'hidden': !this.showSuggestions || !this.suggestions.length }}
        onPointerOver={(e) => e.preventDefault()}
      >
        <div
          id="search-suggestions"
          class="suggestions"
          role="listbox"
          aria-label="Seleziona tra i suggerimenti"
        >
          {this.suggestions.map((suggestion, k) => {
            const items = [];

            if (k === 0) {
              items.push(renderHeading('Cerca la parola', 'word-head'));
            } else if (suggestion.subject && !this.suggestions[k - 1].subject) {
              items.push(<z-divider aria-hidden="true" />);
              items.push(renderHeading('Cerca la materia', 'subj-head'));
            }

            items.push(
              <span
                key={k}
                id={suggestion.id}
                class="suggestion"
                role="option"
                aria-label={suggestion.aria_label}
                aria-selected={this.activeSuggestion === suggestion.id ? 'true' : undefined}
                onClick={() => this.submitSuggestionSearch(suggestion)}
              >
                <z-icon name="left-magnifying-glass" />
                <span
                  aria-hidden="true"
                  innerHTML={suggestion.label}
                />
              </span>
            );

            return items;
          })}
        </div>
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
          {!!this.searchArea && (
            <input
              type="hidden"
              name="area"
              value={this.searchArea}
            />
          )}

          <div
            class="input-wrapper"
            role="none"
          >
            {this.searchQuery && (
              <button
                type="reset"
                aria-label="Svuota campo di ricerca"
                disabled={!this.showSearchbar}
                aria-hidden={!this.showSearchbar ? 'true' : undefined}
                tabIndex={!this.showSearchbar ? -1 : 0}
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
              value={this.searchQuery}
              required
              autocomplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={this.showSuggestions ? 'true' : 'false'}
              aria-controls="search-suggestions"
              aria-activedescendant={this.activeSuggestion}
              aria-label="Cerca per parola chiave o ISBN"
              aria-hidden={!this.showSearchbar ? 'true' : undefined}
              tabIndex={!this.showSearchbar ? -1 : 0}
              onInput={(event) => this.handleInputChange(event)}
              onKeyDown={(e) => {
                // INFO: prevent ESC from clearing input
                if (isEscKey(e)) {
                  e.preventDefault();
                }

                this.handleSuggestionsNav(e);
              }}
            />
          </div>

          <button
            class="searchbar-button"
            aria-label={this.showSearchbar ? 'Esegui ricerca' : 'Apri il campo di ricerca'}
            aria-controls="searchbar-input"
            type={this.showSearchbar ? 'submit' : 'button'}
            onClick={() => this.openSearchbar()}
          >
            {this.showSearchbar ? null : <span class="searchbar-button-label">Cerca</span>}
            <z-icon name="search"></z-icon>
          </button>
        </form>

        {this.renderSuggestions()}
      </Host>
    );
  }
}
