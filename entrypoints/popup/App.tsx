import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { Header } from './components/Header';
import { PagePreviewCard } from './components/PagePreviewCard';
import { StatusFeedback } from './components/StatusFeedback';
import { ActionButton } from './components/ActionButton';
import type {
  PageMetadataPreview,
  PopupState,
  PopupStatus,
  ActiveTabSelection,
} from './types';
import {
  getActiveTab,
  extractPreviewFromTab,
  extractDomSelection,
  isSupportedUrl,
} from './services/extractor';
import { executeClip } from '../schema/clipPipeline';

const INITIAL_METADATA: PageMetadataPreview = {
  title: '',
  domain: '',
  presetName: 'Default',
};

const MAX_SNIPPET_CHARS = 160;

export const App: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    status: 'idle',
    metadata: INITIAL_METADATA,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      try {
        const tab = await getActiveTab();
        if (!tab || !tab.url) {
          return;
        }

        if (!isSupportedUrl(tab.url)) {
          if (isMounted) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              errorMessage:
                'Clipping is not supported on internal browser pages or the Chrome Web Store.',
            }));
          }
          return;
        }

        const [preview, selection] = await Promise.all([
          extractPreviewFromTab(tab),
          tab.id && browser.scripting?.executeScript
            ? browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractDomSelection,
              })
            : Promise.resolve<{ result: ActiveTabSelection }[]>([]),
        ]);

        const selectionResult = selection[0]?.result;

        if (isMounted) {
          setState((prev) => ({
            ...prev,
            metadata: preview,
            selection: selectionResult?.hasSelection
              ? {
                  hasSelection: true,
                  text: selectionResult.text,
                  html: selectionResult.html,
                  wordCount: selectionResult.wordCount,
                  snippet:
                    selectionResult.text.length > MAX_SNIPPET_CHARS
                      ? selectionResult.text
                          .slice(0, MAX_SNIPPET_CHARS)
                          .trim() + '...'
                      : selectionResult.text,
                }
              : undefined,
          }));
        }
      } catch (err) {
        console.warn('Could not load tab preview:', err);
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClip = async () => {
    setState((prev) => ({
      ...prev,
      status: 'clipping',
      errorMessage: undefined,
    }));

    try {
      const tab = await getActiveTab();
      if (!tab || !tab.url) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: 'No active browser tab found.',
        }));
        return;
      }

      const result = await executeClip({
        tab,
        preferredTitle: state.metadata.title,
        preferredAuthor: state.metadata.author,
        downloadLocally: true,
      });

      setState((prev) => ({
        ...prev,
        status: 'success',
        successFilename: result.filename,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage:
          err instanceof Error ? err.message : 'Failed to clip article',
      }));
    }
  };

  const handleRetry = () => {
    void handleClip();
  };

  const handleOpenSettings = () => {
    if (typeof browser !== 'undefined' && browser.runtime?.openOptionsPage) {
      void browser.runtime.openOptionsPage();
    }
  };

  const setDebugPreviewStatus = (status: PopupStatus) => {
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

  const isSelectionMode = Boolean(state.selection?.hasSelection);

  return (
    <div className="flex min-h-[400px] max-h-[520px] w-[380px] flex-col justify-between bg-white text-slate-900 select-none dark:bg-slate-900 dark:text-slate-100">
      <div>
        <Header
          presetName={state.metadata.presetName}
          version="v0.1.0"
          onOpenSettings={handleOpenSettings}
        />

        <main className="flex flex-col gap-3.5 p-4">
          <PagePreviewCard
            metadata={state.metadata}
            selection={state.selection}
          />

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
          label={isSelectionMode ? 'Download Selection' : 'Download Markdown'}
          loadingLabel="Clipping..."
        />

        {/* State preview switchers for testing & verification */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Visual state:</span>
          <div className="flex gap-1">
            {(['idle', 'clipping', 'success', 'error'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setDebugPreviewStatus(status)}
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] capitalize transition-colors ${
                    state.status === status
                      ? 'bg-slate-200 font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400'
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
