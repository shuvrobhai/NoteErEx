import type { ActiveTabSelection } from './types';

export const UNSUPPORTED_SCHEMES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'moz-extension://',
  'devtools://',
  'view-source:',
] as const;

export const MAX_SELECTION_CHARS = 50000;

export function isSupportedUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim().toLowerCase();

  for (const scheme of UNSUPPORTED_SCHEMES) {
    if (trimmed.startsWith(scheme)) {
      return false;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname === 'chromewebstore.google.com' ||
      (parsed.hostname === 'chrome.google.com' &&
        parsed.pathname.startsWith('/webstore'))
    ) {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function countWords(text: string): number {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
    let count = 0;
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike) {
        count++;
      }
    }
    return count;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sanitizeNode(node: Node, doc?: Document): void {
  const unsafeTags = new Set([
    'SCRIPT',
    'STYLE',
    'IFRAME',
    'OBJECT',
    'EMBED',
    'LINK',
  ]);
  const documentObj =
    doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!documentObj) {
    return;
  }

  const walker = documentObj.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  let current: Element | null = walker.currentNode as Element;
  while (current) {
    if (unsafeTags.has(current.tagName)) {
      toRemove.push(current);
    } else {
      const attrs = current.attributes;
      for (let i = attrs.length - 1; i >= 0; i--) {
        const attr = attrs[i];
        if (attr && attr.name.startsWith('on')) {
          current.removeAttribute(attr.name);
        }
      }
    }
    current = walker.nextNode() as Element | null;
  }

  for (const el of toRemove) {
    el.remove();
  }
}

export function extractDomPreview(
  doc?: Document,
  fallbackTitle?: string,
  fallbackUrl?: string,
): {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  wordCount: number;
  readingTime: number;
} {
  const documentNode =
    doc ?? (typeof document !== 'undefined' ? document : undefined);

  const fallbackDomain = (() => {
    if (!fallbackUrl) return '';
    try {
      return new URL(fallbackUrl).hostname;
    } catch {
      return '';
    }
  })();

  if (!documentNode) {
    return {
      title: fallbackTitle || 'Web Page',
      domain: fallbackDomain,
      wordCount: 0,
      readingTime: 1,
    };
  }

  const win =
    documentNode.defaultView ??
    (typeof window !== 'undefined' ? window : undefined);
  const locationHostname =
    fallbackDomain || win?.location?.hostname || '';

  const title =
    documentNode
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content')
      ?.trim() ||
    documentNode.title?.trim() ||
    fallbackTitle ||
    locationHostname ||
    'Web Page';

  const domain = locationHostname;

  const author =
    documentNode
      .querySelector('meta[name="author"]')
      ?.getAttribute('content')
      ?.trim() ||
    documentNode
      .querySelector('meta[property="article:author"]')
      ?.getAttribute('content')
      ?.trim() ||
    documentNode.querySelector('[rel="author"]')?.textContent?.trim() ||
    undefined;

  const date =
    documentNode
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute('content')
      ?.trim() ||
    documentNode
      .querySelector('meta[name="date"]')
      ?.getAttribute('content')
      ?.trim() ||
    documentNode.querySelector('time')?.getAttribute('datetime')?.trim() ||
    documentNode.querySelector('time')?.textContent?.trim() ||
    undefined;

  const bodyText = documentNode.body
    ? documentNode.body.innerText || documentNode.body.textContent || ''
    : '';
  const wordCount = countWords(bodyText);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title,
    domain,
    author: author || undefined,
    date: date || undefined,
    wordCount,
    readingTime,
  };
}

export function extractDomSelection(
  win?: Window,
  _fallbackTitle?: string,
  _fallbackUrl?: string,
): ActiveTabSelection {
  const windowObj =
    win ?? (typeof window !== 'undefined' ? window : undefined);
  if (!windowObj || !windowObj.getSelection) {
    return {
      hasSelection: false,
      text: '',
      html: '',
      wordCount: 0,
    };
  }

  const selection = windowObj.getSelection();
  if (!selection) {
    return {
      hasSelection: false,
      text: '',
      html: '',
      wordCount: 0,
    };
  }

  const selectedText = selection.toString().trim();

  if (!selectedText) {
    return {
      hasSelection: false,
      text: '',
      html: '',
      wordCount: 0,
    };
  }

  let range: Range | null;
  try {
    range =
      typeof selection.getRangeAt === 'function'
        ? selection.getRangeAt(0)
        : null;
  } catch {
    range = null;
  }
  if (!range) {
    return {
      hasSelection: false,
      text: '',
      html: '',
      wordCount: 0,
    };
  }

  const fragment = range.cloneContents();
  const doc = windowObj.document;
  const container = doc.createElement('div');
  container.appendChild(fragment);

  sanitizeNode(container, doc);

  let html = container.innerHTML;
  if (html.length > MAX_SELECTION_CHARS) {
    html = html.slice(0, MAX_SELECTION_CHARS);
  }

  const text = selectedText.slice(0, MAX_SELECTION_CHARS);
  const wordCount = countWords(text);

  return {
    hasSelection: true,
    text,
    html,
    wordCount,
  };
}
