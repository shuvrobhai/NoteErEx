import { Readability } from '@mozilla/readability';

export interface ExtractedArticlePayload {
  title: string;
  byline?: string;
  excerpt?: string;
  content: string;
  textContent: string;
  length: number;
  siteName?: string;
  url: string;
  error?: string;
}

export function extractArticleWithReadability(
  doc: Document = document,
  url: string = typeof window !== 'undefined' ? window.location.href : '',
): ExtractedArticlePayload {
  try {
    const documentClone = doc.cloneNode(true) as Document;
    const reader = new Readability(documentClone);
    const article = reader.parse();

    const title =
      article?.title?.trim() ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
      doc.title?.trim() ||
      'Untitled Article';

    const byline =
      article?.byline?.trim() ||
      doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[property="article:author"]')?.getAttribute('content')?.trim() ||
      undefined;

    const excerpt =
      article?.excerpt?.trim() ||
      doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
      undefined;

    const content = article?.content || doc.body?.innerHTML || '';
    const textContent = article?.textContent || doc.body?.innerText || doc.body?.textContent || '';
    const length = article?.length || textContent.length;
    const siteName =
      article?.siteName?.trim() ||
      doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
      undefined;

    return {
      title,
      byline,
      excerpt,
      content,
      textContent,
      length,
      siteName,
      url,
    };
  } catch (error) {
    return {
      title: doc.title?.trim() || 'Untitled Article',
      content: doc.body?.innerHTML || '',
      textContent: doc.body?.innerText || doc.body?.textContent || '',
      length: 0,
      url,
      error: error instanceof Error ? error.message : 'Readability parsing failed',
    };
  }
}

export default defineUnlistedScript(() => {
  return extractArticleWithReadability();
});
