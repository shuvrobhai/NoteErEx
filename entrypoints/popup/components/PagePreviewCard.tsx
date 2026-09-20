import React from 'react';
import type { PageMetadataPreview } from '../types';

interface PagePreviewCardProps {
  metadata: PageMetadataPreview;
  selection?: {
    hasSelection: boolean;
    wordCount: number;
    snippet: string;
  };
}

export const PagePreviewCard: React.FC<PagePreviewCardProps> = ({
  metadata,
  selection,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-800/40">
      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span className="font-mono text-[11px] font-medium tracking-tight text-slate-600 dark:text-slate-300">
            {metadata.domain || 'Active tab'}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {selection?.hasSelection ? 'Selection preview' : 'Page preview'}
        </span>
      </div>

      <h2
        className="mb-2.5 line-clamp-2 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100"
        title={metadata.title || 'Loading page details...'}
      >
        {metadata.title || (
          <span className="text-slate-400 italic dark:text-slate-500">
            Detecting page title...
          </span>
        )}
      </h2>

      {selection?.hasSelection && (
        <div className="mb-2.5 rounded-lg border border-indigo-200/60 bg-indigo-50/60 p-2.5 text-xs text-indigo-900 dark:border-indigo-800/60 dark:bg-indigo-950/30 dark:text-indigo-200">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              Selection
            </span>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
              {selection.wordCount.toLocaleString()} words
            </span>
          </div>
          <p className="line-clamp-2 text-indigo-800/90 dark:text-indigo-300/80">
            {selection.snippet}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {metadata.author && (
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-600 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700/80 dark:text-slate-300">
            <svg
              className="h-3 w-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="max-w-[120px] truncate">{metadata.author}</span>
          </span>
        )}

        {metadata.date && (
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-600 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700/80 dark:text-slate-300">
            <svg
              className="h-3 w-3 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{metadata.date}</span>
          </span>
        )}

        {typeof metadata.wordCount === 'number' && metadata.wordCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-slate-600 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700/80 dark:text-slate-300">
            <span>{metadata.wordCount.toLocaleString()} words</span>
          </span>
        )}

        {typeof metadata.readingTime === 'number' &&
          metadata.readingTime > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300">
              <svg
                className="h-3 w-3 text-indigo-500 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{metadata.readingTime} min read</span>
            </span>
          )}
      </div>
    </div>
  );
};
