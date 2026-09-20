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

export async function handleError(error: ClipError): Promise<void> {
  const preferences = await getPreferences();

  if (preferences.notificationEnabled) {
    try {
      await browser.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-48.png',
        title: 'Web to Markdown Error',
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
    }, 3000);
  } catch {
    // Badge update failed
  }
}

async function getPreferences() {
  const { getPreferences: getPrefs } = await import('./storage');
  return getPrefs();
}
