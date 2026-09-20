declare module 'turndown-plugin-gfm' {
  import TurndownService from 'turndown';

  function gfm(turndownService: TurndownService): void;

  export { gfm };
}
