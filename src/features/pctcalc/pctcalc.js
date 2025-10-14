// /src/features/pctcalc/pctcalc.js
import './pctcalc.css';

(() => {
  const CALC_URL = 'https://gleeful-faun-12d319.netlify.app/';

  // Undgå dobbel-mount
  if (window.__pctcalcMounted) return;
  window.__pctcalcMounted = true;

  // PRIMÆR placering: værktøjsområde for slæbeprocenter, hvis tilstede
  // Sekundær: ved label/input for slæbeprocent-feltet
  // Tertiær: første element, der matcher tekst 'Slæbeprocenter'
  function findMountPoint() {
    // 1) Eksplicit hook hvis appen har sat data-attr
    let el = document.querySelector('[data-slaebepct-tools]');
    if (el) return el;

    // 2) Kendte id/navne
    el = document.querySelector('#slaebPct, [name="slaebPct"], [data-field="slaebPct"]');
    if (el) {
      // lav en lille inline container ved siden af feltet/label
      const wrapper = document.createElement('span');
      wrapper.className = 'pctcalc-inline-tools';
      el.insertAdjacentElement('afterend', wrapper);
      return wrapper;
    }

    // 3) Fuzzy: find header/label med teksten "Slæbeprocenter"
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,label,legend,span,div'));
    const head = candidates.find(n => (n.textContent || '').trim().toLowerCase().includes('slæbeprocenter'));
    if (head) {
      const wrapper = document.createElement('span');
      wrapper.className = 'pctcalc-inline-tools';
      head.insertAdjacentElement('beforeend', wrapper);
      return wrapper;
    }

    // 4) Fald tilbage til body (øverst til højre via fixed? Nej: undlad. Åbn kun i nyt faneblad via global knap)
    return null;
  }

  function makeButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pctcalc-btn';
    btn.setAttribute('aria-label', 'Åbn procent-lommeregner');
    btn.title = 'Åbn lommeregner';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 3h10v4H7V6zm0 6h4v2H7v-2zm6 0h4v2h-4v-2zm-6 4h4v2H7v-2zm6 0h4v2h-4v-2z"/>
      </svg>
      <span>Lommeregner</span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModalOrTab();
    });
    return btn;
  }

  function renderModal() {
    const modal = document.createElement('div');
    modal.className = 'pctcalc-modal';
    modal.id = 'pctcalc-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="pctcalc-backdrop" data-close="1"></div>
      <div class="pctcalc-body" role="dialog" aria-modal="true" aria-label="Procent-lommeregner">
        <button class="pctcalc-close" type="button" aria-label="Luk">✕</button>
        <iframe class="pctcalc-frame" title="Procent-lommeregner"
          src="${CALC_URL}" referrerpolicy="no-referrer" loading="lazy"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

    // Luk via overlay/knap/Escape
    modal.addEventListener('click', (ev) => {
      if (ev.target && ev.target.getAttribute('data-close') === '1') closeModal();
    });
    modal.querySelector('.pctcalc-close')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', escHandler);

    function escHandler(e){ if (e.key === 'Escape' && !modal.hidden) closeModal(); }
    function closeModal(){
      modal.hidden = true;
    }

    return {
      open(){ modal.hidden = false; setTimeout(()=>modal.querySelector('iframe')?.focus(), 50); },
      close: closeModal
    };
  }

  // Singleton modal controller
  const modalCtrl = renderModal();

  function openModalOrTab() {
    try {
      modalCtrl.open();
    } catch {
      // Fallback: nyt faneblad (på meget stramme CSP/iframe-politikker)
      window.open(CALC_URL, '_blank', 'noopener,noreferrer');
    }
  }

  // Mount knap uden at forstyrre eksisterende layout
  function mount() {
    const mountPoint = findMountPoint();
    if (mountPoint && !mountPoint.querySelector('.pctcalc-btn')) {
      mountPoint.appendChild(makeButton());
      return true;
    }
    // Hvis vi ikke fandt noget sikkert mountpoint, gør INTET (fail-silent).
    return false;
  }

  // Kør efter DOM er ready (ikke afhængig af frameworks)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
