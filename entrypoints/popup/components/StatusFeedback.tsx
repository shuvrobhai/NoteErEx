import React from 'react';
import type { PopupStatus } from '../types';

interface StatusFeedbackProps {
  status: PopupStatus;
  errorMessage?: string;
  successFilename?: string;
  onRetry?: () => void;
}

export const StatusFeedback: React.FC<StatusFeedbackProps> = ({
  status,
  errorMessage,
  successFilename,
  onRetry,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[44px] transition-all duration-200"
    >
      {status === 'idle' && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>Ready to convert article to clean markdown.</span>
          </div>
        </div>
      )}

      {status === 'clipping' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
          <svg
            className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Extracting article content and generating markdown...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2 overflow-hidden">
            <svg
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div className="truncate">
              <span className="font-semibold">Saved!</span>{' '}
              {successFilename && (
                <span className="font-mono text-[11px] opacity-90">
                  {successFilename}
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
            Downloaded
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2 overflow-hidden">
            <svg
              className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="truncate">
              <span className="font-semibold">Failed:</span>{' '}
              <span>{errorMessage || 'Extraction encountered an error.'}</span>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-md bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:bg-rose-900/60 dark:text-rose-200 dark:hover:bg-rose-800/80"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};
