import { browser } from 'wxt/browser';
import type { ClipError } from './types';

export function createClipError(
  code: ClipError['code'],
  stage: ClipError['stage'],
  message: string,
  url: string,
  details?: unknown,
): ClipError {
  return {
    code,
    stage,
    message,
    url,
    timestamp: new Date().toISOString(),
    details,
  };
}

const BADGE_CLEAR_DELAY_MS = 3000;

export async function handleError(error: ClipError): Promise<void> {
  const preferences = await fetchStoredPreferences();

  if (preferences.notificationEnabled) {
    try {
      if (browser.notifications?.create) {
        await browser.notifications.create({
          type: 'basic',
          iconUrl: '/icon/128.png',
          title: 'NoteErEx Error',
          message: error.message,
          priority: 2,
        });
        return;
      }
    } catch {
      // Notification permission denied or not available
    }
  }

  try {
    if (browser.action?.setBadgeText) {
      await browser.action.setBadgeText({ text: '!' }).catch(() => {});
      await browser.action
        .setBadgeBackgroundColor({ color: '#ff4444' })
        .catch(() => {});

      if (typeof setTimeout === 'function') {
        setTimeout(() => {
          browser.action?.setBadgeText({ text: '' }).catch(() => {});
        }, BADGE_CLEAR_DELAY_MS);
      }
    }
  } catch {
    // Badge update failed gracefully
  }
}

async function fetchStoredPreferences() {
  const { getPreferences } = await import('./storage');
  return getPreferences();
}
