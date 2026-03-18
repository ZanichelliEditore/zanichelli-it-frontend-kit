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
  private resizeObserver: ResizeObserver;

  @Element() host: HTMLZanitBackToTopElement;

  /** Indicates whether the back-to-top button is visible and usable. */
  @State()
  showFab: boolean = false;

  /** Indicates the current height of the page. */
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

  private handleResize = () => {
    const newHeight = document.documentElement.scrollHeight;
    if (newHeight !== this.currentPageHeight) this.currentPageHeight = newHeight;
  };

  connectedCallback() {
    this.currentPageHeight = document.body.scrollHeight;
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(document.documentElement);

    this.updateFabVisibility();

    const mobileMediaQuery = window.matchMedia('(width < 768px)');
    this.isMobile = mobileMediaQuery.matches;
    mobileMediaQuery.onchange = (mql) => {
      this.isMobile = mql.matches;
    };
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
  }

  private updateFabVisibility() {
    this.showFab = this.currentPageHeight > this.pageMinHeight && window.scrollY > this.scrollMinHeight;
  }

  private scroll() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render() {
    return (
      <Host
        class={{ hidden: !this.showFab }}
        aria-hidden={this.showFab ? 'false' : 'true'}
      >
        <button
          class={{ 'z-fab': true, 'z-fab-extended': !this.isMobile }}
          onClick={() => this.scroll()}
        >
          <z-icon name="back-top" />
          <span>Torna su</span>
        </button>
      </Host>
    );
  }
}
