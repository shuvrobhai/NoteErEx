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
      await browser.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-48.png',
        title: 'NoteErEx Error',
        message: error.message,
        priority: 2,
      });
      return;
    } catch {
      // Notification permission denied or not available
    }
  }

  try {
    await browser.action.setBadgeText({ text: '!' });
    await browser.action.setBadgeBackgroundColor({ color: '#ff4444' });
    setTimeout(async () => {
      await browser.action.setBadgeText({ text: '' });
    }, BADGE_CLEAR_DELAY_MS);
  } catch {
    // Badge update failed
  }
}

async function fetchStoredPreferences() {
  const { getPreferences } = await import('./storage');
  return getPreferences();
}
