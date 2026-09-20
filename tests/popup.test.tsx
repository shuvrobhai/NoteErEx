import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Header } from '../entrypoints/popup/components/Header';
import { PagePreviewCard } from '../entrypoints/popup/components/PagePreviewCard';
import { ActionButton } from '../entrypoints/popup/components/ActionButton';
import { StatusFeedback } from '../entrypoints/popup/components/StatusFeedback';
import { App } from '../entrypoints/popup/App';

// Inform React 19 of act test environment
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Popup UI Foundation (Feature 4)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders Header with extension title, version, and active preset chip (AC-2)', async () => {
    const onOpenSettings = vi.fn();

    await act(async () => {
      root.render(
        <Header
          presetName="GitHub"
          version="v1.2.0"
          onOpenSettings={onOpenSettings}
        />,
      );
    });

    expect(container.textContent).toContain('Web to Markdown');
    expect(container.textContent).toContain('v1.2.0');
    expect(container.textContent).toContain('GitHub');

    const settingsBtn = container.querySelector('button[aria-label="Extension Settings"]');
    expect(settingsBtn).not.toBeNull();
    settingsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders PagePreviewCard with title, domain, author, and reading time (AC-3)', async () => {
    await act(async () => {
      root.render(
        <PagePreviewCard
          metadata={{
            title: 'Exploring Web Components and Micro Frontends',
            domain: 'web.dev',
            author: 'Jane Doe',
            date: 'Sep 20, 2026',
            wordCount: 1850,
            readingTime: 7,
            presetName: 'Default',
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Exploring Web Components and Micro Frontends');
    expect(container.textContent).toContain('web.dev');
    expect(container.textContent).toContain('Jane Doe');
    expect(container.textContent).toContain('Sep 20, 2026');
    expect(container.textContent).toContain('1,850 words');
    expect(container.textContent).toContain('7 min read');
  });

  it('renders ActionButton in idle state and triggers onClick (AC-4)', async () => {
    const onClick = vi.fn();

    await act(async () => {
      root.render(
        <ActionButton onClick={onClick} label="Download Markdown" />,
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Download Markdown');
    expect(button?.getAttribute('aria-busy')).toBe('false');
    expect(button?.disabled).toBe(false);

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders ActionButton in loading state with spinner and disabled state (AC-4)', async () => {
    const onClick = vi.fn();

    await act(async () => {
      root.render(
        <ActionButton
          onClick={onClick}
          isLoading={true}
          loadingLabel="Clipping..."
        />,
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Clipping...');
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.disabled).toBe(true);

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders StatusFeedback in idle, clipping, success, and error states (AC-5, AC-6)', async () => {
    // 1. Idle
    await act(async () => {
      root.render(<StatusFeedback status="idle" />);
    });
    expect(container.textContent).toContain('Ready to convert');
    const statusContainer = container.querySelector('[role="status"]');
    expect(statusContainer?.getAttribute('aria-live')).toBe('polite');

    // 2. Clipping
    await act(async () => {
      root.render(<StatusFeedback status="clipping" />);
    });
    expect(container.textContent).toContain('Extracting article content');

    // 3. Success
    await act(async () => {
      root.render(
        <StatusFeedback
          status="success"
          successFilename="my-awesome-article.md"
        />,
      );
    });
    expect(container.textContent).toContain('Saved!');
    expect(container.textContent).toContain('my-awesome-article.md');

    // 4. Error with retry
    const onRetry = vi.fn();
    await act(async () => {
      root.render(
        <StatusFeedback
          status="error"
          errorMessage="Network timeout while fetching content."
          onRetry={onRetry}
        />,
      );
    });
    expect(container.textContent).toContain('Failed:');
    expect(container.textContent).toContain('Network timeout while fetching content.');

    const retryBtn = container.querySelector('button');
    expect(retryBtn?.textContent).toContain('Retry');
    retryBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders App shell layout and handles simulated clipping transition (AC-1, AC-4, AC-5)', async () => {
    vi.useFakeTimers();

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Web to Markdown');
    expect(container.textContent).toContain('Default');
    expect(container.textContent).toContain('Download Markdown');
    expect(container.textContent).toContain('Ready to convert');

    // Click Download Markdown
    const downloadBtn = container.querySelector('footer button') as HTMLButtonElement;
    await act(async () => {
      downloadBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Now state should be clipping
    expect(container.textContent).toContain('Clipping...');
    expect(container.textContent).toContain('Extracting article content');

    // Advance timers for simulation
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });

    // State should now be success
    expect(container.textContent).toContain('Saved!');
    expect(container.textContent).toContain('how-to-build-accessible-modern-chrome-extensions.md');

    vi.useRealTimers();
  });
});
