import { useEffect, useState } from 'react';
import { initPWAInstall, promptInstall, isInstalled, env, markNudgedIOS } from '../pwa/install';

export default function InstallPWA() {
  const [ready, setReady] = useState(false); // Chromium beforeinstallprompt
  const [installed, setInstalled] = useState(isInstalled());
  const [iosBanner, setIosBanner] = useState(false); // sticky banner
  const [iosModal, setIosModal] = useState(false); // fullscreen modal
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  const isChromium = hasWindow && hasNavigator && (!!(window as any).chrome || /edg/i.test(navigator.userAgent));
  const isiOS = env.isiOS;
  const isSafari = env.isSafari;

  useEffect(() => {
    initPWAInstall();
    const onCan = () => setReady(true);
    const onInstalled = () => setInstalled(true);
    const onNudge = () => {
      if (isSafari) {
        setIosBanner(true);
        setIosModal(true);
      }
    };
    document.addEventListener('pwa:can-install', onCan);
    document.addEventListener('pwa:installed', onInstalled);
    document.addEventListener('pwa:ios-nudge', onNudge);
    return () => {
      document.removeEventListener('pwa:can-install', onCan);
      document.removeEventListener('pwa:installed', onInstalled);
      document.removeEventListener('pwa:ios-nudge', onNudge);
    };
  }, [isSafari]);

  if (installed) return null;

  async function onClickInstall() {
    const res = await promptInstall();
    if (res === 'accepted') setInstalled(true);
  }

  function closeIosBanner() {
    setIosBanner(false);
    markNudgedIOS();
  }
  function closeIosModal() {
    setIosModal(false);
    markNudgedIOS();
  }

  return (
    <>
      {/* iOS sticky banner (kun Safari) */}
      {isiOS && isSafari && iosBanner && (
        <div className="pwa-ios-banner" role="region" aria-label="Installér som webapp">
          <div className="hint">
            <b>Installér CSMate:</b> Åbn <b>Del</b> ▸ <b>Tilføj til hjemmeskærm</b>
          </div>
          <button className="close" onClick={closeIosBanner} aria-label="Skjul">
            Luk
          </button>
        </div>
      )}

      {/* Android/desktop knap (Chromium) */}
      {isChromium && ready && (
        <div className="pwa-install-wrap">
          <button className="pwa-install-btn" onClick={onClickInstall} aria-label="Installér app">
            Installér app
          </button>
        </div>
      )}

      {/* iOS fullscreen modal guide */}
      {isiOS && isSafari && iosModal && (
        <div className="pwa-ios-modal" role="dialog" aria-modal="true" aria-label="Tilføj til hjemmeskærm">
          <div className="card">
            <h2>Installér som webapp</h2>
            <p>Sådan får du CSMate som “rigtig app” på din iPhone/iPad:</p>
            <ol>
              <li>
                Åbn siden i <b>Safari</b>.
              </li>
              <li>
                Tryk <b>Del</b> (firkanter med pil op).
              </li>
              <li>
                Vælg <b>Tilføj til hjemmeskærm</b>.
              </li>
              <li>
                Navngiv fx <b>CSMate</b> og tryk <b>Tilføj</b>.
              </li>
            </ol>
            <div className="actions">
              <button className="btn secondary" onClick={closeIosModal}>
                Senere
              </button>
              <button className="btn" onClick={closeIosModal}>
                Forstået
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
