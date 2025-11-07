// content.js
console.log("Content script loaded!");

const style = document.createElement('style');
style.textContent = `
  /* Hide top navigation and sidebars */
  #community-navigation,
  .global-explore-navigation__top,
  .global-top-navigation,
  .right-rail-wrapper,
  .global-explore-navigation,
  .page__right-rail,
  .wds-button.wds-is-text,
  .wds-button.wds-is-text:disabled,
  .global-footer__content,
  .global-footer__bottom,
  .page-footer,
  .top-ads-container,
  .top_leaderboard-odyssey-wrapper,
  .fandom-community-header__top-container,
  .license-description,
  .page-side-tools__wrapper,
  .ArticleAnonymousComments_anonymousCommentsCounter__hgqSZ p,
  .ArticleAnonymousComments_anonymousCommentsContent__uSoxq {
    display: none !important;
  }

  /* Keep main content visible */
  .page__main {
    border-radius: 3px 3px 0 0;
    width: 54%;
    margin: 0 auto;
  }
  
  
  .page__main {
    background-color: var(--theme-page-background-color);
    border-radius: 3px;
    min-height: 480px;
    padding: 24px 36px;
    position: relative;
    margin-left: -12% !important;
    width: 55% !important;
}
`;

document.head.appendChild(style);
