import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ConversionOptions } from './types';
import { CONVERSION_OPTIONS } from './constants';

export function buildTurndownConfig(imageHandling: 'strip' | 'preserve'): TurndownService {
  const turndown = new TurndownService({
    bulletListMarker: CONVERSION_OPTIONS.bulletListMarker,
    codeBlockStyle: 'fenced',
  });

  turndown.use(gfm);

  if (imageHandling === 'strip') {
    turndown.addRule('strip-images', {
      filter: 'img',
      replacement: () => '',
    });
  }

  return turndown;
}

export function convertHtmlToMarkdown(
  html: string,
  options: { imageHandling?: 'strip' | 'preserve' } = {},
): string {
  const turndown = buildTurndownConfig(options.imageHandling ?? 'preserve');
  return turndown.turndown(html);
}

export function getConversionOptions(): ConversionOptions {
  return { ...CONVERSION_OPTIONS };
}

