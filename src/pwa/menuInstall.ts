import { canInstall, promptInstall, env } from './install';

/** Brug i din topbar/menu:
 *  import { pwaMenuInstall } from '@/pwa/menuInstall';
 *  const item = pwaMenuInstall();
 *  if (item) menuItems.push(item);
 */
export function pwaMenuInstall() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  const isChromium = !!(window as any).chrome || /edg/i.test(navigator.userAgent);
  if (isChromium && canInstall()) {
    return {
      id: 'install-app',
      label: 'Installér app',
      onClick: async () => {
        await promptInstall();
      },
    };
  }
  if (env.isiOS && env.isSafari) {
    return {
      id: 'install-ios',
      label: 'Tilføj til hjemmeskærm',
      onClick: () => {
        document.dispatchEvent(new CustomEvent('pwa:ios-nudge'));
      },
    };
  }
  return null;
}
