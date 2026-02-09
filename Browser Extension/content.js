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
  .bottom-ads-container,
   ad_unit,
  .bottom-ads-container #bottom_leaderboard,
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

iframe#recipeFrame {
  width: 860px;
  height: 700px;
  border: none;
  overflow: hidden; /* hides both scrollbars */
}

iframe#recipeFrame::-webkit-scrollbar {
  display: none; /* Chrome/Edge/Safari */
}

.minesOverlay {
    position: absolute;
    top: 45px !important;
    left: 0px;
    width: 100%;
    max-height: 400px;
    overflow-y: auto;
    background-color: rgb(245, 244, 234);
    display: block;
    padding: 10px;
}
`;

document.head.appendChild(style);



