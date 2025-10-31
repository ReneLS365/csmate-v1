type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let isStandalone = false;

const nav = typeof navigator === 'undefined' ? undefined : navigator;
const UA = nav?.userAgent ?? '';
const isiOS = /iphone|ipad|ipod/i.test(UA);
const isSafari = isiOS && /Safari/i.test(UA) && !/CriOS|FxiOS|EdgiOS/i.test(UA);

const IOS_NUDGE_KEY = 'pwaIosNudgedAt';
const IOS_NUDGE_DAYS = 7;

function shouldNudgeIOS(): boolean {
  try {
    const ts = localStorage.getItem(IOS_NUDGE_KEY);
    if (!ts) return true;
    const last = Number(ts);
    const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return days >= IOS_NUDGE_DAYS;
  } catch {
    return true;
  }
}
export function markNudgedIOS() {
  try {
    localStorage.setItem(IOS_NUDGE_KEY, String(Date.now()));
  } catch {}
}

export function initPWAInstall() {
  // Android/desktop (Chromium)
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    document.dispatchEvent(new CustomEvent('pwa:can-install', { detail: true }));
  });

  // Standalone detektering
  const mq = window.matchMedia('(display-mode: standalone)');
  const inStandalone = (navigator as any).standalone || mq.matches;
  isStandalone = !!inStandalone;
  if (isStandalone) document.dispatchEvent(new CustomEvent('pwa:installed'));
  mq.addEventListener?.('change', () => {
    const now = (navigator as any).standalone || mq.matches;
    if (now) document.dispatchEvent(new CustomEvent('pwa:installed'));
  });

  // Trigger iOS nudge ved første visning (og højst 1 gang pr. 7 dage)
  if (!isStandalone && isSafari && shouldNudgeIOS()) {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('pwa:ios-nudge'));
    }, 1200);
  }
}

export function canInstall(): boolean {
  return !!deferred;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  deferred.prompt();
  try {
    const choice = await deferred.userChoice;
    deferred = null;
    return choice?.outcome ?? 'dismissed';
  } catch {
    deferred = null;
    return 'dismissed';
  }
}

export function isInstalled(): boolean {
  return isStandalone;
}

export const env = { isiOS, isSafari };
