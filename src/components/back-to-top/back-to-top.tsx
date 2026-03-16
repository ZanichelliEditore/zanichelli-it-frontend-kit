import { Component, Element, Host, Listen, Prop, State, h } from '@stencil/core';

/**
 * Back to top floating action button component.
 * Appears on scroll, given a min height for both scroll height and page height.
 */
@Component({
  tag: 'zanit-back-to-top',
  styleUrls: ['back-to-top.css'],
  shadow: false,
  scoped: true,
})
export class ZanitBackTop {
  @Element() host: HTMLZanitBackToTopElement;

  /** Indicates whether the back-to-top button is visible and usable. */
  @State()
  showFab: boolean = false;

  /** Indicates whether the back-to-top button is visible and usable. */
  @State()
  currentPageHeight: number;

  /** Indicates if the viewport is mobile. */
  @State()
  isMobile: boolean = false;

  /** Min page height from which the back-to-top button must appear. */
  @Prop()
  pageMinHeight: number = 1600;

  /** Min scroll height from which the back-to-top button must appear. */
  @Prop()
  scrollMinHeight: number = 800;

  @Listen('scroll', { target: 'window', passive: true })
  handleScroll() {
    this.updateFabVisibility();
  }

  /** Observer to track page height. */
  observer = new ResizeObserver(() => {
    const newHeight = document.documentElement.scrollHeight;
    if (newHeight !== this.currentPageHeight) this.currentPageHeight = newHeight;
  });

  connectedCallback() {
    this.currentPageHeight = document.body.scrollHeight;
    this.observer.observe(document.documentElement);

    this.updateFabVisibility();

    const mobileMediaQuery = window.matchMedia('(width < 768px)');
    this.isMobile = mobileMediaQuery.matches;
    mobileMediaQuery.onchange = (mql) => {
      this.isMobile = mql.matches;
    };
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  private updateFabVisibility() {
    this.showFab = this.currentPageHeight > this.pageMinHeight && window.scrollY > this.scrollMinHeight;
  }

  private scroll() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render() {
    if (!this.showFab) return null;

    return (
      <Host>
        <button
          class={'z-fab' + (this.isMobile ? '' : ' z-fab-extended')}
          onClick={() => this.scroll()}
        >
          <z-icon name="back-top" />
          <span>Torna su</span>
        </button>
      </Host>
    );
  }
}
