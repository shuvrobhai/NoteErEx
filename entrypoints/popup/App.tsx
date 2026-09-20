import React, { useState } from 'react';
import { Header } from './components/Header';
import { PagePreviewCard } from './components/PagePreviewCard';
import { StatusFeedback } from './components/StatusFeedback';
import { ActionButton } from './components/ActionButton';
import type { PageMetadataPreview, PopupState, PopupStatus } from './types';

const INITIAL_METADATA: PageMetadataPreview = {
  title: 'How to Build Accessible and High-Performance Modern Chrome Extensions',
  domain: 'developer.chrome.com',
  author: 'Chrome DevRel',
  date: 'Sep 20, 2026',
  wordCount: 1420,
  readingTime: 6,
  presetName: 'Default',
};

export const App: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    status: 'idle',
    metadata: INITIAL_METADATA,
  });

  const handleClip = () => {
    setState((prev) => ({ ...prev, status: 'clipping', errorMessage: undefined }));
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        status: 'success',
        successFilename: 'how-to-build-accessible-modern-chrome-extensions.md',
      }));
    }, 1200);
  };

  const handleRetry = () => {
    handleClip();
  };

  const handleOpenSettings = () => {
    if (typeof browser !== 'undefined' && browser.runtime?.openOptionsPage) {
      void browser.runtime.openOptionsPage();
    }
  };

  const setManualStatus = (status: PopupStatus) => {
    if (status === 'error') {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Unable to extract main article content from the page.',
      }));
    } else if (status === 'success') {
      setState((prev) => ({
        ...prev,
        status: 'success',
        successFilename: 'quick-article-export.md',
      }));
    } else {
      setState((prev) => ({
        ...prev,
        status,
        errorMessage: undefined,
        successFilename: undefined,
      }));
    }
  };

  return (
    <div className="flex min-h-[400px] max-h-[520px] w-[380px] flex-col justify-between bg-white text-slate-900 select-none dark:bg-slate-900 dark:text-slate-100">
      <div>
        <Header
          presetName={state.metadata.presetName}
          version="v0.1.0"
          onOpenSettings={handleOpenSettings}
        />

        <main className="flex flex-col gap-3.5 p-4">
          <PagePreviewCard metadata={state.metadata} />

          <StatusFeedback
            status={state.status}
            errorMessage={state.errorMessage}
            successFilename={state.successFilename}
            onRetry={handleRetry}
          />
        </main>
      </div>

      <footer className="border-t border-slate-100 p-4 pt-3 dark:border-slate-800/80">
        <ActionButton
          onClick={handleClip}
          isLoading={state.status === 'clipping'}
          disabled={state.status === 'clipping'}
          label="Download Markdown"
          loadingLabel="Clipping..."
        />

        {/* State preview switchers for testing & verification */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Visual state:</span>
          <div className="flex gap-1">
            {(['idle', 'clipping', 'success', 'error'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setManualStatus(s)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] capitalize transition-colors ${
                  state.status === s
                    ? 'bg-slate-200 font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
