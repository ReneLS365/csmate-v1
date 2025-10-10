// --- Utility Functions ---
function resolveSectionId(id) {
  if (!id) return '';
  const base = id.endsWith('Section') ? id.slice(0, -7) : id;
  const normalized = normalizeKey(base);
  const finalBase = normalized || base.replace(/Section$/i, '');
  return `${finalBase}Section`;
}

function forEachNode(nodeList, callback) {
  if (!nodeList || typeof callback !== 'function') return;

  if (typeof nodeList.forEach === 'function') {
    nodeList.forEach(callback);
    return;
  }

  for (let index = 0; index < nodeList.length; index += 1) {
    callback(nodeList[index], index, nodeList);
  }
}

function vis(id) {
  const targetId = resolveSectionId(id);
  const sections = document.querySelectorAll('.sektion');

  if (!sections.length) return;

  let activeId = targetId;
  let hasMatch = false;
  for (let index = 0; index < sections.length; index += 1) {
    if (sections[index].id === activeId) {
      hasMatch = true;
      break;
    }
  }

  if (!hasMatch) {
    const fallback = sections[0];
    activeId = fallback ? fallback.id : '';
  }

  forEachNode(sections, section => {
    const isActive = section.id === activeId;
    section.classList.toggle('active', isActive);
    section.style.display = isActive ? 'flex' : 'none';
    section.toggleAttribute('hidden', !isActive);
    section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  const navButtons = document.querySelectorAll('header nav button[data-section]');
  forEachNode(navButtons, btn => {
    const buttonTarget = resolveSectionId(btn.dataset.section);
    const isActive = buttonTarget === activeId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

let guideModalPreviousFocus = null;

function getGuideModalElement() {
  return document.getElementById('guideModal');
}

function openGuideModal() {
  const modal = getGuideModalElement();
  if (!modal) return;
  guideModalPreviousFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  modal.removeAttribute('hidden');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  const content = modal.querySelector('.modal-content');
  if (content && typeof content.focus === 'function') {
    content.focus();
  }
}

function closeGuideModal() {
  const modal = getGuideModalElement();
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('hidden', '');
  if (guideModalPreviousFocus && typeof guideModalPreviousFocus.focus === 'function') {
    guideModalPreviousFocus.focus();
  }
  guideModalPreviousFocus = null;
}

function setupGuideModal() {
  const modal = getGuideModalElement();
  if (!modal) return;

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeGuideModal());
  }

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeGuideModal();
    }
  });

  document.getElementById('btnOpenGuideModal')?.addEventListener('click', () => {
    openGuideModal();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const currentModal = getGuideModalElement();
      if (currentModal && currentModal.classList.contains('open')) {
        closeGuideModal();
      }
    }
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value == null) {
    return 0;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return 0;
  }

  const compactValue = stringValue.replace(/\s+/g, '').replace(/'/g, '');
  const separators = compactValue.match(/[.,]/g) || [];
  let normalized = compactValue.replace(/[^0-9.,-]/g, '');

  if (separators.length > 1) {
    const lastSeparator = separators[separators.length - 1];
    const decimalIndex = normalized.lastIndexOf(lastSeparator);
    const integerPart = normalized.slice(0, decimalIndex).replace(/[.,]/g, '').replace(/(?!^)-/g, '');
    const fractionalPart = normalized.slice(decimalIndex + 1).replace(/[^0-9]/g, '');
    normalized = `${integerPart || '0'}.${fractionalPart}`;
  } else if (separators.length === 1) {
    if (/^-?\d{1,3}(?:[.,]\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/[.,]/g, '').replace(/(?!^)-/g, '');
    } else {
      const separator = separators[0];
      const decimalIndex = normalized.lastIndexOf(separator);
      const integerPart = normalized.slice(0, decimalIndex).replace(/[.,]/g, '').replace(/(?!^)-/g, '');
      const fractionalPart = normalized.slice(decimalIndex + 1).replace(/[^0-9]/g, '');
      normalized = `${integerPart || '0'}.${fractionalPart}`;
    }
  } else {
    normalized = normalized.replace(/(?!^)-/g, '');
  }

  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatNumber(value) {
  const num = Number.isFinite(value) ? value : (parseFloat(value) || 0);
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

const DIACRITIC_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]/g;

function normalizeKey(value) {
  if (value == null) return '';
  const lower = String(value).toLowerCase();
  const canNormalize = typeof String.prototype.normalize === 'function';
  const normalized = canNormalize ? lower.normalize('NFD') : lower;
  const stripped = canNormalize ? normalized.replace(DIACRITIC_REGEX, '') : normalized;
  return stripped.replace(NON_ALPHANUMERIC_REGEX, '');
}

// Materialer der kun bruges i Løn-fanen – må ikke vises i Optælling
const EXCLUDED_MATERIAL_NAMES = [
  'Luk af hul', 'Opskydeligt rækværk', 'Borring i beton', 'Huller',
  'Km.', 'Udd. tillæg 1', 'Udd. tillæg 2', 'Mentortillæg'
];

const EXCLUDED_MATERIAL_KEYS = EXCLUDED_MATERIAL_NAMES.map(name => normalizeKey(name));

// --- Global Variables ---
let admin = false;
let workerCount = 0;
let laborEntries = [];
let lastLoensum = 0;
let lastMaterialSum = 0;
let lastEkompletData = null;
let currentStatus = 'kladde';
let recentCasesCache = [];
let cachedDBPromise = null;
const DEFAULT_ACTION_HINT = 'Udfyld Sagsinfo for at fortsætte.';
const DB_NAME = 'csmate_projects';
const DB_STORE = 'projects';
const TRAELLE_RATE35 = 10.44;
const TRAELLE_RATE50 = 14.62;

// --- Scaffold Part Lists ---
const dataBosta = [
  { id: 1, name: "Spindelfod kort", price: 2.675425, quantity: 0 },
  { id: 2, name: "Spindelfod lang", price: 2.675425, quantity: 0 },
  { id: 3, name: "Vippefod", price: 4.4305038, quantity: 0 },
  { id: 4, name: "Strø / trykudligner", price: 1.77, quantity: 0 },
  { id: 5, name: "Ramme 200/70", price: 16.7053537, quantity: 0 },
  { id: 6, name: "Ramme 150/70", price: 16.7053537, quantity: 0 },
  { id: 7, name: "Ramme 100/70", price: 16.7053537, quantity: 0 },
  { id: 8, name: "Ramme 80/70", price: 16.7053537, quantity: 0 },
  { id: 9, name: "Ramme 66/70", price: 16.7053537, quantity: 0 },
  { id: 10, name: "Gulvplade 300/70", price: 16.7053537, quantity: 0 },
  { id: 11, name: "Gulvplade 250/70", price: 12.5316907, quantity: 0 },
  { id: 12, name: "Gulvplade 200/70", price: 12.5316907, quantity: 0 },
  { id: 13, name: "Gulvplade 150/70", price: 8.35, quantity: 0 },
  { id: 14, name: "Gulvplade 125/70", price: 8.35, quantity: 0 },
  { id: 15, name: "Gulvplade 70/70", price: 8.35, quantity: 0 },
  { id: 16, name: "Gulvplade 300/35", price: 8.35, quantity: 0 },
  { id: 17, name: "Gulvplade 250/35", price: 6.2604945, quantity: 0 },
  { id: 18, name: "Gulvplade 200/35", price: 6.2604945, quantity: 0 },
  { id: 19, name: "Gulvplade 150/35", price: 4.18, quantity: 0 },
  { id: 20, name: "Gulvplade 125/35", price: 4.18, quantity: 0 },
  { id: 21, name: "Stigedæk 300/70", price: 20.8790167, quantity: 0 },
  { id: 22, name: "Stigedæk 250/70", price: 16.7053537, quantity: 0 },
  { id: 23, name: "Stigedæk 200/70", price: 12.5316907, quantity: 0 },
  { id: 24, name: "Ståldæk 300/35", price: 15.66, quantity: 0 },
  { id: 25, name: "Ståldæk 250/35", price: 10.4448592, quantity: 0 },
  { id: 26, name: "Ståldæk 200/35", price: 8.35, quantity: 0 },
  { id: 27, name: "Stige 200", price: 4.5054157, quantity: 0 },
  { id: 28, name: "Stige 300", price: 4.5054157, quantity: 0 },
  { id: 29, name: "Stigestøtte", price: 2.8634, quantity: 0 },
  { id: 30, name: "Diagonaler 200", price: 9.3960926, quantity: 0 },
  { id: 31, name: "Diagonaler 203", price: 9.3960926, quantity: 0 },
  { id: 32, name: "Gelænder 125", price: 3.13, quantity: 0 },
  { id: 33, name: "Gelænder 150", price: 3.13, quantity: 0 },
  { id: 34, name: "Gelænder 200", price: 3.9243, quantity: 0 },
  { id: 35, name: "Gelænder 250", price: 3.9243, quantity: 0 },
  { id: 36, name: "Gelænder 300", price: 5.2224296, quantity: 0 },
  { id: 37, name: "Tvær Gel. 70", price: 3.13, quantity: 0 },
  { id: 38, name: "Dob. Tværgelænder", price: 6.2604945, quantity: 0 },
  { id: 39, name: "Dob. G", price: 16.7053537, quantity: 0 },
  { id: 40, name: "L Rør", price: 16.7053537, quantity: 0 },
  { id: 41, name: "B Rør", price: 8.35, quantity: 0 },
  { id: 42, name: "Konsol 140", price: 27.5568775, quantity: 0 },
  { id: 43, name: "Konsol 100", price: 19.2844634, quantity: 0 },
  { id: 44, name: "Konsol 70", price: 15.1536072, quantity: 0 },
  { id: 45, name: "Konsol 35", price: 11.03, quantity: 0 },
  { id: 46, name: "Fodspark 300", price: 9.3960926, quantity: 0 },
  { id: 47, name: "Fodspark 250", price: 8.35, quantity: 0 },
  { id: 48, name: "Fodspark 200", price: 8.35, quantity: 0 },
  { id: 49, name: "Fodspark 150", price: 6.2604945, quantity: 0 },
  { id: 50, name: "Fodspark 125", price: 6.2604945, quantity: 0 },
  { id: 51, name: "Kanthæk 300", price: 27.99, quantity: 0 },
  { id: 52, name: "Kanthæk 250", price: 27.99, quantity: 0 },
  { id: 53, name: "Kanthæk 200", price: 27.99, quantity: 0 },
  { id: 54, name: "Kanthæk 70", price: 27.99, quantity: 0 },
  { id: 55, name: "Tværprofil aludr.", price: 15.1536072, quantity: 0 },
  { id: 56, name: "Alu. Drager pr. m.", price: 17.12, quantity: 0 },
  { id: 57, name: "Gelændertvinge", price: 3.9917341, quantity: 0 },
  { id: 58, name: "Tværprofin ram.", price: 15.1536072, quantity: 0 },
  { id: 59, name: "Dæklås", price: 3.9917341, quantity: 0 },
  { id: 60, name: "Samlerør til aludr.", price: 14.26, quantity: 0 },
  { id: 61, name: "Flapper/Singel", price: 3.9917341, quantity: 0 },
  { id: 62, name: "Fastkobling", price: 3.9917341, quantity: 0 },
  { id: 63, name: "Drejekobling", price: 3.9917341, quantity: 0 },
  { id: 64, name: "Kipfingerkobling", price: 3.9917341, quantity: 0 },
  { id: 65, name: "SK Kobling", price: 3.9917341, quantity: 0 },
  { id: 66, name: "Rørsamler", price: 3.9917341, quantity: 0 },
  { id: 67, name: "Stilladsrør 1M", price: 5.5113755, quantity: 0 },
  { id: 68, name: "Stilladsrør 2M", price: 11.022751, quantity: 0 },
  { id: 69, name: "Stilladsrør 3M", price: 16.5341265, quantity: 0 },
  { id: 70, name: "Stilladsrør 4M", price: 22.04, quantity: 0 },
  { id: 71, name: "Stilladsrør 5M", price: 27.55, quantity: 0 },
  { id: 72, name: "Stilladsrør 6M", price: 33.063, quantity: 0 },
  { id: 73, name: "Stilladsrør 6M alu", price: 23.94, quantity: 0 },
  { id: 74, name: "Bøjleanker", price: 14.6185222, quantity: 0 },
  { id: 75, name: "Rør anker alu", price: 14.6185222, quantity: 0 },
  { id: 76, name: "Rør anker stål", price: 18.7921852, quantity: 0 },
  { id: 77, name: "Reklameskilt", price: 9.7335, quantity: 0 },
  { id: 78, name: "Grøn skilt", price: 5.15, quantity: 0 },
  { id: 79, name: "Startprofil til trappe", price: 4.1308562, quantity: 0 },
  { id: 80, name: "Alu trappeløb", price: 51.2219, quantity: 0 },
  { id: 81, name: "Gelænder trpl", price: 13.3878267, quantity: 0 },
  { id: 82, name: "Dobb bundramme", price: 44.8615264, quantity: 0 },
  { id: 83, name: "Tragt", price: 38.9862931, quantity: 0 },
  { id: 84, name: "Skaktrør", price: 38.9855, quantity: 0 },
  { id: 85, name: "Alu.bro pr. m", price: 15.1204, quantity: 0 },
  { id: 86, name: "Net pr kvm", price: 2.8466522, quantity: 0 },
  { id: 87, name: "Plast pr kvm", price: 6.8383863, quantity: 0 },
  { id: 88, name: "Geda hejs", price: 303.0828457, quantity: 0 },
  { id: 89, name: "El hejs", price: 153.07, quantity: 0 },
  { id: 90, name: "Kegle u.fod", price: 6.1491, quantity: 0 },
  { id: 91, name: "Kirkefod", price: 6.8276846, quantity: 0 },
  { id: 92, name: "Plader pr kvm", price: 8.2082039, quantity: 0 },
  { id: 93, name: "Planker    M", price: 12.26, quantity: 0 },
  { id: 94, name: "Hjulkonsoller", price: 21.424, quantity: 0 },
  { id: 95, name: "Kegle m. fod", price: 10.33, quantity: 0 },
  { id: 96, name: "Bræt rød/hvid", price: 6.28, quantity: 0 },
];

// Trim statisk fallback-liste, hvis den stadig indeholder >96
if (Array.isArray(dataBosta) && dataBosta.length > 96) {
  dataBosta.splice(96, dataBosta.length - 96);
}

const dataHaki = [
  { id: 101, name: "Spindelfod kort", price: 2.68, quantity: 0 },
  { id: 102, name: "BPF Fodsokkel", price: 3.04, quantity: 0 },
  { id: 103, name: "Strø / trykudligner", price: 1.77, quantity: 0 },
  { id: 104, name: "FS 3,0 m Søjle", price: 25.05, quantity: 0 },
  { id: 105, name: "FS 2,0 m Søjle", price: 16.7, quantity: 0 },
  { id: 106, name: "FS 1,5 m Søjle", price: 12.53, quantity: 0 },
  { id: 107, name: "FS 1.0 m Søjle", price: 8.35, quantity: 0 },
  { id: 108, name: "FS 0,5 m Søjle", price: 4.18, quantity: 0 },
  { id: 109, name: "LB 3,0 m bjælke", price: 17.75, quantity: 0 },
  { id: 110, name: "LB 2,5 m bjælke", price: 16.71, quantity: 0 },
  { id: 111, name: "TB 1,9 m bjælke", price: 6.26, quantity: 0 },
  { id: 112, name: "TB 1,6 m bjælke", price: 6.26, quantity: 0 },
  { id: 113, name: "TB 1,2 m bjælke", price: 5.22, quantity: 0 },
  { id: 114, name: "TB 1,0 m bjælke", price: 5.22, quantity: 0 },
  { id: 115, name: "TB 0,5 m bjælke", price: 5.22, quantity: 0 },
  { id: 116, name: "Net pr. m2", price: 2.85, quantity: 0 },
  { id: 117, name: "Plastik pr. m2", price: 6.84, quantity: 0 },
  { id: 118, name: "SKR 3.0 m rækværk", price: 5.22, quantity: 0 },
  { id: 119, name: "SKR 1.9 m rækværk", price: 3.92, quantity: 0 },
  { id: 120, name: "SKR 1.6 m rækværk", price: 3.92, quantity: 0 },
  { id: 121, name: "SKR 1.2 m rækværk", price: 3.13, quantity: 0 },
  { id: 122, name: "SKR 1.0 m rækværk", price: 3.13, quantity: 0 },
  { id: 123, name: "Trappeløb", price: 51.35, quantity: 0 },
  { id: 124, name: "Trappe gelænder", price: 13.39, quantity: 0 },
  { id: 125, name: "Bøjleanker", price: 14.62, quantity: 0 },
  { id: 126, name: "Røranker alu", price: 14.62, quantity: 0 },
  { id: 127, name: "Røranker stål", price: 18.79, quantity: 0 },
  { id: 128, name: "Stilladsrør 1M", price: 5.51, quantity: 0 },
  { id: 129, name: "Stilladsrør 2M", price: 11.02, quantity: 0 },
  { id: 130, name: "Stilladsrør 3M", price: 16.53, quantity: 0 },
  { id: 131, name: "Stilladsrør 4M", price: 22.04, quantity: 0 },
  { id: 132, name: "Stilladsrør 5M", price: 27.55, quantity: 0 },
  { id: 133, name: "Stilladsrør 6M", price: 33.94, quantity: 0 },
  { id: 134, name: "Stilladsrør 6M alu", price: 23.94, quantity: 0 },
  { id: 135, name: "Alu.Drager pr. m.", price: 17.12, quantity: 0 },
  { id: 136, name: "Diagonalstag 3.0 m", price: 9.4, quantity: 0 },
  { id: 137, name: "Diagonalstag 1,6 m", price: 9.4, quantity: 0 },
  { id: 138, name: "Traller 2.2 x 0.35m", price: 10.44, quantity: 0 },
  { id: 139, name: "Traller 2.2 x 0.5m", price: 14.62, quantity: 0 },
  { id: 140, name: "Traller 2,2 x 0,5m alu", price: 10.44, quantity: 0 },
  { id: 141, name: "Kantbrædder", price: 9.4, quantity: 0 },
  { id: 142, name: "Låsejern", price: 1.14, quantity: 0 },
  { id: 143, name: "Stiger til 3m", price: 4.51, quantity: 0 },
  { id: 144, name: "Skaktrør", price: 38.99, quantity: 0 },
  { id: 145, name: "Tragt", price: 38.99, quantity: 0 },
  { id: 146, name: "Koblinger fast", price: 3.99, quantity: 0 },
  { id: 147, name: "Koblinger dreje", price: 3.99, quantity: 0 },
  { id: 148, name: "Koblinger SK", price: 3.99, quantity: 0 },
  { id: 149, name: "Koblinger Kipfinger", price: 3.99, quantity: 0 },
  { id: 150, name: "Koblinger singel", price: 3.99, quantity: 0 },
  { id: 151, name: "Koblinger samler", price: 3.99, quantity: 0 },
  { id: 152, name: "Dobbelt tværgelænder", price: 6.26, quantity: 0 },
  { id: 153, name: "Grønne skilte", price: 5.15, quantity: 0 },
  { id: 154, name: "Reklameskilt", price: 9.73, quantity: 0 },
  { id: 155, name: "Kegle uden fod", price: 6.15, quantity: 0 },
  { id: 156, name: "Kegle med fod", price: 10.33, quantity: 0 },
  { id: 157, name: "Bræt", price: 6.28, quantity: 0 },
  { id: 158, name: "Geda hejs", price: 303.08, quantity: 0 },
  { id: 159, name: "El hejs", price: 153.07, quantity: 0 },
];

const dataModex = [
  { id: 161, name: "Spindelfod", price: 2.68, quantity: 0 },
  { id: 162, name: "Begynderstykke", price: 4.18, quantity: 0 },
  { id: 163, name: "Vertikalstander 300", price: 25.05, quantity: 0 },
  { id: 164, name: "Vertikalstander 200", price: 16.7, quantity: 0 },
  { id: 165, name: "Vertikalstander 150", price: 12.53, quantity: 0 },
  { id: 166, name: "Vertikalstander 100", price: 8.35, quantity: 0 },
  { id: 167, name: "Horisontalrør 300", price: 9.4, quantity: 0 },
  { id: 168, name: "Horisontalrør 250", price: 6.26, quantity: 0 },
  { id: 169, name: "Horisontalrør 200", price: 6.25, quantity: 0 },
  { id: 170, name: "Horisontalrør 150", price: 5.23, quantity: 0 },
  { id: 171, name: "Horisontalrør 125", price: 5.22, quantity: 0 },
  { id: 172, name: "Horisontalrør 113", price: 5.22, quantity: 0 },
  { id: 173, name: "Horisontalrør  74", price: 5.22, quantity: 0 },
  { id: 174, name: "U-profil 150", price: 5.22, quantity: 0 },
  { id: 175, name: "U-profil 113", price: 5.22, quantity: 0 },
  { id: 176, name: "Løftesikring 113", price: 3.99, quantity: 0 },
  { id: 177, name: "Løftesikring 150", price: 3.99, quantity: 0 },
  { id: 178, name: "Diagonal 200/300", price: 9.4, quantity: 0 },
  { id: 179, name: "Diagonal 200/250", price: 9.4, quantity: 0 },
  { id: 180, name: "Diagonal 200/200", price: 9.4, quantity: 0 },
  { id: 181, name: "Diagonal 200/150", price: 9.4, quantity: 0 },
  { id: 182, name: "Diagonal 200/113", price: 9.4, quantity: 0 },
  { id: 183, name: "Fodspark 300", price: 9.4, quantity: 0 },
  { id: 184, name: "Fodspark 250", price: 8.35, quantity: 0 },
  { id: 185, name: "Fodspark 200", price: 8.35, quantity: 0 },
  { id: 186, name: "Fodspark 150", price: 6.26, quantity: 0 },
  { id: 187, name: "Fodspark 125", price: 6.26, quantity: 0 },
  { id: 188, name: "Stigedæk 3m", price: 20.88, quantity: 0 },
  { id: 189, name: "Stigedæk 2,5m", price: 16.71, quantity: 0 },
  { id: 190, name: "Stigedæk 2m ", price: 12.53, quantity: 0 },
  { id: 191, name: "Profildæk 32/300", price: 15.66, quantity: 0 },
  { id: 192, name: "Profildæk 32/250", price: 10.44, quantity: 0 },
  { id: 193, name: "Profildæk 32/200", price: 8.35, quantity: 0 },
  { id: 194, name: "Profildæk 32/150", price: 6.26, quantity: 0 },
  { id: 195, name: "Profildæk 32/125", price: 6.26, quantity: 0 },
  { id: 196, name: "Profildæk 32/74", price: 6.26, quantity: 0 },
  { id: 197, name: "Profildæk 70/300", price: 16.71, quantity: 0 },
  { id: 198, name: "Profildæk 70/250", price: 12.53, quantity: 0 },
  { id: 199, name: "Profildæk 70/200", price: 12.53, quantity: 0 },
  { id: 200, name: "Profildæk 70/150", price: 8.35, quantity: 0 },
  { id: 201, name: "Profildæk 70/125", price: 8.35, quantity: 0 },
  { id: 202, name: "Profildæk 70/70", price: 8.35, quantity: 0 },
  { id: 203, name: "Stilladsrør 1M", price: 5.51, quantity: 0 },
  { id: 204, name: "Stilladsrør 2M", price: 11.02, quantity: 0 },
  { id: 205, name: "Stilladsrør 3M", price: 16.53, quantity: 0 },
  { id: 206, name: "Stilladsrør 4M", price: 22.04, quantity: 0 },
  { id: 207, name: "Stilladsrør 5M", price: 27.55, quantity: 0 },
  { id: 208, name: "Stilladsrør 6M", price: 33.06, quantity: 0 },
  { id: 209, name: "Stilladsrør 6M alu", price: 23.94, quantity: 0 },
  { id: 211, name: "Klodæk 300/70", price: 16.71, quantity: 0 },
  { id: 212, name: "Klodæk 250/70", price: 12.53, quantity: 0 },
  { id: 213, name: "Alutrappe 2m", price: 51.33, quantity: 0 },
  { id: 214, name: "Gelænder til trappe", price: 13.39, quantity: 0 },
  { id: 215, name: "Koblinger fast", price: 3.99, quantity: 0 },
  { id: 216, name: "Koblinger dreje", price: 3.99, quantity: 0 },
  { id: 217, name: "Koblinger SK", price: 3.99, quantity: 0 },
  { id: 218, name: "Koblinger Kipfinger", price: 3.99, quantity: 0 },
  { id: 219, name: "Koblinger singel", price: 3.99, quantity: 0 },
  { id: 220, name: "Koblinger samler", price: 3.99, quantity: 0 },
  { id: 221, name: "Bøjleanker", price: 14.62, quantity: 0 },
  { id: 222, name: "Røranker alu", price: 14.62, quantity: 0 },
  { id: 223, name: "Røranker stål", price: 18.79, quantity: 0 },
  { id: 224, name: "Strø / trykudligner", price: 1.77, quantity: 0 },
  { id: 225, name: "Alu. Drager pr. m.", price: 17.12, quantity: 0 },
  { id: 226, name: "Grønne skilte", price: 5.15, quantity: 0 },
  { id: 227, name: "Reklameskilt", price: 9.73, quantity: 0 },
  { id: 228, name: "Stiger 2m & 3M", price: 4.51, quantity: 0 },
];

// Additional system: Alfix overdækning 2025
// The Alfix list contains a small set of components sourced from the provided Excel sheet.  Each item gets a
// consecutive id following the existing datasets to avoid collisions.
const dataAlfix = [
  { id: 201, name: 'Kipdrager 4,5 m', price: 249.66, quantity: 0 },
  { id: 202, name: 'Alu drager pr. m', price: 17.12, quantity: 0 },
  { id: 203, name: '4,5 m kederdrager', price: 175.68, quantity: 0 },
  { id: 204, name: 'Samlerør til aludrager', price: 14.26, quantity: 0 },
  { id: 205, name: '3 m kededrager', price: 117.12, quantity: 0 },
  { id: 206, name: '2,25 m kederdrager', price: 87.84, quantity: 0 },
  { id: 207, name: '1,5 m kederdrager', price: 58.56, quantity: 0 },
  { id: 208, name: 'Flapper/singel', price: 3.99, quantity: 0 },
  { id: 209, name: 'Fastkobling', price: 3.99, quantity: 0 },
  { id: 210, name: 'Horisontal/gelænder', price: 5.22, quantity: 0 },
  { id: 211, name: 'Drejekobling', price: 3.99, quantity: 0 },
  { id: 212, name: 'Diagonal', price: 9.40, quantity: 0 },
  { id: 213, name: 'Kipfingerkobling', price: 3.99, quantity: 0 },
  { id: 214, name: 'SK kobling', price: 3.99, quantity: 0 },
  { id: 215, name: 'Keder-teltdug pr. m²', price: 6.42, quantity: 0 },
  { id: 216, name: 'Rørsamler', price: 3.99, quantity: 0 },
  { id: 217, name: 'Stilladsrør 1M', price: 5.51, quantity: 0 },
  { id: 218, name: 'Stilladsrør 2M', price: 11.02, quantity: 0 },
  { id: 219, name: 'Stilladsrør 3M', price: 16.53, quantity: 0 },
  { id: 220, name: 'Stilladsrør 4M', price: 22.04, quantity: 0 },
  { id: 221, name: 'Stilladsrør 5M', price: 27.55, quantity: 0 },
  { id: 222, name: 'Stilladsrør 6M', price: 33.06, quantity: 0 },
  { id: 223, name: 'Stilladsrør 6M alu', price: 23.94, quantity: 0 },
  { id: 224, name: 'Dragestyr', price: 10.13, quantity: 0 },
  { id: 225, name: 'Trekantdrager pr. m', price: 35.53, quantity: 0 },
];
dataAlfix.forEach(item => {
  if (item && typeof item === 'object') {
    item.systemKey = 'alfix';
  }
});

const systemOptions = [
  { key: 'bosta', label: 'Bosta', dataset: dataBosta },
  { key: 'haki', label: 'HAKI', dataset: dataHaki },
  { key: 'modex', label: 'MODEX', dataset: dataModex },
  { key: 'alfix', label: 'Alfix', dataset: dataAlfix },
];

systemOptions.forEach(option => {
  if (!Array.isArray(option.dataset)) return;
  option.dataset.forEach(item => {
    if (item && typeof item === 'object') {
      item.systemKey = option.key;
    }
  });
});

const systemLabelMap = new Map(systemOptions.map(option => [option.key, option.label]));

const selectedSystemKeys = new Set(systemOptions.length ? [systemOptions[0].key] : []);

function ensureSystemSelection() {
  if (selectedSystemKeys.size === 0 && systemOptions.length) {
    selectedSystemKeys.add(systemOptions[0].key);
  }
}

function getSelectedSystemKeys() {
  ensureSystemSelection();
  return Array.from(selectedSystemKeys);
}

function getDatasetForSelectedSystems(selected) {
  const lists = [];
  const rawSelection = Array.isArray(selected)
    ? selected
    : (selected && typeof selected[Symbol.iterator] === 'function'
      ? Array.from(selected)
      : []);
  const normalizedSelection = rawSelection.map(value => normalizeKey(value));
  const selectionSet = new Set(normalizedSelection);

  const addIfSelected = (synonyms, dataset) => {
    if (!Array.isArray(dataset)) return;
    const match = synonyms.some(key => selectionSet.has(normalizeKey(key)));
    if (match) {
      lists.push(dataset);
    }
  };

  addIfSelected(['bosta', 'bostadata'], dataBosta);
  addIfSelected(['haki', 'hakidata'], dataHaki);
  addIfSelected(['modex', 'modexdata'], dataModex);
  addIfSelected(['alfix', 'alfixdata'], dataAlfix);

  return lists.flat();
}

function toggleDuplicateWarning(duplicates = [], conflicts = []) {
  const warning = document.getElementById('systemDuplicateWarning');
  if (!warning) return;
  const duplicateNames = Array.from(new Set(duplicates.filter(Boolean))).slice(0, 6);
  const conflictNames = Array.from(new Set(conflicts.filter(Boolean))).slice(0, 6);
  if (duplicateNames.length === 0 && conflictNames.length === 0) {
    warning.textContent = '';
    warning.setAttribute('hidden', '');
    return;
  }

  const parts = [];
  if (duplicateNames.length) {
    parts.push(`Materialer slået sammen: ${duplicateNames.join(', ')}`);
  }
  if (conflictNames.length) {
    parts.push(`Kontroller varenr.: ${conflictNames.join(', ')}`);
  }
  warning.textContent = parts.join('. ');
  warning.removeAttribute('hidden');
}

function aggregateSelectedSystemData() {
  const datasets = getDatasetForSelectedSystems(getSelectedSystemKeys());
  const aggregated = [];
  const seenIds = new Map();
  const seenNames = new Map();
  const duplicateNames = new Set();
  const conflictingIds = new Set();

  datasets.forEach(item => {
    if (!item) return;
    const idKey = item.id != null ? String(item.id) : null;
    const nameKey = item.name ? normalizeKey(item.name) : null;
    const existingByName = nameKey ? seenNames.get(nameKey) : null;
    if (existingByName && existingByName !== item) {
      duplicateNames.add(existingByName.name);
      duplicateNames.add(item.name);
      return;
    }

    const existingById = idKey ? seenIds.get(idKey) : null;
    if (existingById && existingById !== item) {
      const existingNameKey = existingById.name ? normalizeKey(existingById.name) : null;
      if (existingNameKey && nameKey && existingNameKey === nameKey) {
        duplicateNames.add(existingById.name);
        duplicateNames.add(item.name);
        return;
      }
      conflictingIds.add(existingById.name);
      conflictingIds.add(item.name);
    }

    aggregated.push(item);
    if (idKey) {
      seenIds.set(idKey, item);
    }
    if (nameKey) {
      seenNames.set(nameKey, item);
    }
  });

  toggleDuplicateWarning(Array.from(duplicateNames), Array.from(conflictingIds));
  return aggregated;
}

const manualMaterials = Array.from({ length: 3 }, (_, index) => ({
  id: `manual-${index + 1}`,
  name: '',
  price: 0,
  quantity: 0,
  manual: true,
}));

function hydrateMaterialListsFromJson() {
  const mapList = (target, entries, prefix) => {
    if (!Array.isArray(entries) || entries.length === 0) return false;
    const previous = new Map(
      target.map(item => [normalizeKey(item.name || ''), item.quantity || 0])
    );
    const filteredEntries = entries.filter(entry => {
      const rawName = entry?.beskrivelse ?? entry?.navn ?? entry?.name ?? '';
      const key = normalizeKey(String(rawName).trim());
      return !EXCLUDED_MATERIAL_KEYS.includes(key);
    });

    const next = filteredEntries.map((entry, index) => {
      const rawName = entry?.beskrivelse ?? entry?.navn ?? entry?.name ?? '';
      const baseName = String(rawName).trim();
      const name = baseName || `${prefix} materiale ${index + 1}`;
      const key = normalizeKey(name);
      const priceValue = entry?.pris ?? entry?.price ?? 0;
      return {
        id: `${prefix}-${index + 1}`,
        name,
        price: toNumber(priceValue),
        quantity: previous.get(key) ?? 0,
      };
    });
    target.splice(0, target.length, ...next);
    return true;
  };

  const candidateSources = [
    { target: dataBosta, prefix: 'B', sources: ['Bosta', 'bosta', 'BOSTA', 'BOSTA_DATA'] },
    { target: dataHaki, prefix: 'H', sources: ['HAKI', 'haki', 'HAKI_DATA'] },
    { target: dataModex, prefix: 'M', sources: ['MODEX', 'modex', 'MODEX_DATA'] },
    { target: dataAlfix, prefix: 'A', sources: ['Alfix', 'alfix', 'ALFIX', 'ALFIX_DATA'] },
  ].map(({ target, prefix, sources }) => ({
    target,
    prefix,
    normalizedSources: sources
      .map(source => normalizeKey(source)),
  }));

  const applyLists = lists => {
    if (!lists || typeof lists !== 'object') return false;
    const normalizedLists = new Map();
    for (const [rawKey, value] of Object.entries(lists)) {
      const normalizedKey = normalizeKey(rawKey);
      if (normalizedKey) {
        normalizedLists.set(normalizedKey, value);
      }
    }

    let hydrated = false;
    for (const { target, prefix, normalizedSources } of candidateSources) {
      for (const candidateKey of normalizedSources) {
        if (!normalizedLists.has(candidateKey)) continue;
        const entries = normalizedLists.get(candidateKey);
        if (mapList(target, entries, prefix)) {
          hydrated = true;
          break;
        }
      }
    }

    if (hydrated) {
      renderOptaelling();
      updateTotals(true);
    }

    return hydrated;
  };

  const tryDatasetFallback = () => {
    if (typeof fetch !== 'function') return Promise.resolve(false);

    return fetch('./dataset.js')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(script => {
        const factory = new Function(
          `${script}; return {
            BOSTA_DATA: typeof BOSTA_DATA !== 'undefined' ? BOSTA_DATA : undefined,
            HAKI_DATA: typeof HAKI_DATA !== 'undefined' ? HAKI_DATA : undefined,
            MODEX_DATA: typeof MODEX_DATA !== 'undefined' ? MODEX_DATA : undefined,
            ALFIX_DATA: typeof ALFIX_DATA !== 'undefined' ? ALFIX_DATA : undefined,
          };`
        );
        const data = factory();
        return applyLists({
          BOSTA_DATA: data?.BOSTA_DATA,
          HAKI_DATA: data?.HAKI_DATA,
          MODEX_DATA: data?.MODEX_DATA,
          ALFIX_DATA: data?.ALFIX_DATA,
        });
      })
      .catch(err => {
        console.error('Kunne ikke indlæse fallback dataset.js', err);
        return false;
      });
  };

  if (typeof fetch !== 'function') {
    applyLists(typeof window !== 'undefined' ? window.COMPLETE_LISTS : undefined);
    return;
  }

  fetch('./complete_lists.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(applyLists)
    .then(applied => applied || tryDatasetFallback())
    .catch(err => {
      console.warn('Kunne ikke hente komplette materialelister', err);
      return tryDatasetFallback();
    });
}

function getAllData(includeManual = true) {
  const combined = aggregateSelectedSystemData();
  if (!includeManual) return combined;
  return combined.concat(manualMaterials);
}

function getActiveMaterialList() {
  return aggregateSelectedSystemData();
}

function findMaterialById(id) {
  const allSets = [dataBosta, dataHaki, dataModex, dataAlfix, manualMaterials];
  for (const list of allSets) {
    const match = list.find(item => String(item.id) === String(id));
    if (match) return match;
  }
  return null;
}

// --- UI for List Selection ---
function setupListSelectors() {
  const container = document.getElementById('listSelectors');
  if (!container) return;
  const warningId = 'systemSelectionWarning';
  const duplicateWarningId = 'systemDuplicateWarning';
  const optionsHtml = systemOptions
    .map(option => {
      const checked = selectedSystemKeys.has(option.key) ? 'checked' : '';
      return `
        <label class="system-option">
          <input type="checkbox" value="${option.key}" ${checked}>
          <span>${option.label}</span>
        </label>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="system-selector" role="group" aria-labelledby="systemSelectorLabel">
      <span id="systemSelectorLabel" class="cell-label">Systemer</span>
      <div class="system-selector-options">${optionsHtml}</div>
    </div>
    <p id="${warningId}" class="hint system-warning" hidden>Vælg mindst ét system.</p>
    <p id="${duplicateWarningId}" class="hint system-warning" hidden></p>
  `;

  syncSystemSelectorState();
  const warning = document.getElementById(warningId);

  container.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;

    const { value } = target;
    if (target.checked) {
      selectedSystemKeys.add(value);
    } else {
      selectedSystemKeys.delete(value);
      if (selectedSystemKeys.size === 0) {
        warning?.removeAttribute('hidden');
        selectedSystemKeys.add(value);
        target.checked = true;
        updateActionHint('Vælg mindst ét system for at fortsætte optællingen.', 'error');
        return;
      }
    }

    warning?.setAttribute('hidden', '');
    const hint = document.getElementById('actionHint');
    if (hint && hint.textContent === 'Vælg mindst ét system for at fortsætte optællingen.') {
      updateActionHint('');
    }
    renderOptaelling();
    updateTotals(true);
  });
}

function syncSystemSelectorState() {
  const container = document.getElementById('listSelectors');
  if (!container) return;
  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = selectedSystemKeys.has(input.value);
  });
}

// --- Rendering Functions ---
function renderOptaelling() {
  const container = document.getElementById('optaellingContainer');
  if (!container) return;
  container.innerHTML = '';
  syncSystemSelectorState();

  const activeItems = getActiveMaterialList();
  const items = Array.isArray(activeItems)
    ? activeItems.concat(manualMaterials)
    : manualMaterials.slice();

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-state">Ingen systemer valgt. Vælg et eller flere systemer for at starte optællingen.</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'materials-list';
  container.appendChild(list);

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = `mat-row material-row${item.manual ? ' manual' : ''}`;
    if (item.systemKey) {
      row.dataset.system = item.systemKey;
    }
    const nameLabel = document.createElement('label');
    nameLabel.className = 'mat-name';
    nameLabel.innerHTML = '<span class="cell-label">Materiale</span>';

    if (item.manual) {
      const manualWrapper = document.createElement('div');
      manualWrapper.className = 'manual-name-wrapper';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'manual-name';
      nameInput.dataset.id = item.id;
      nameInput.placeholder = 'Materiale';
      nameInput.value = item.name || '';
      manualWrapper.appendChild(nameInput);

      const manualId = document.createElement('span');
      manualId.className = 'item-id';
      manualId.textContent = `ID: ${item.id}`;
      manualWrapper.appendChild(manualId);

      nameLabel.appendChild(manualWrapper);
      nameLabel.classList.add('manual-name-cell');
    } else {
      const systemLabel = item.systemKey ? systemLabelMap.get(item.systemKey) || item.systemKey : '';
      const badge = systemLabel ? `<span class="system-badge">${systemLabel}</span>` : '';
      const nameWrapper = document.createElement('div');
      nameWrapper.className = 'item-name-wrapper';
      nameWrapper.innerHTML = `
        <div class="item-name">${item.name}${badge}</div>
        <span class="item-id">Varenr. ${item.id}</span>
      `;
      nameLabel.appendChild(nameWrapper);
    }

    const qtyLabel = document.createElement('label');
    qtyLabel.className = 'mat-qty-col';
    qtyLabel.innerHTML = '<span class="cell-label">Antal</span>';
    const qtyInput = document.createElement('input');
    qtyInput.type = 'text';
    qtyInput.className = 'qty mat-qty';
    qtyInput.dataset.id = item.id;
    qtyInput.inputMode = 'decimal';
    if (item.manual) {
      qtyInput.placeholder = 'Antal';
      const hasQuantity = item.quantity !== null && item.quantity !== undefined && item.quantity !== '';
      qtyInput.value = hasQuantity ? String(item.quantity) : '';
    } else {
      const qtyValue = item.quantity != null ? item.quantity : 0;
      qtyInput.value = String(qtyValue);
    }
    qtyLabel.appendChild(qtyInput);

    const priceLabel = document.createElement('label');
    priceLabel.className = 'mat-price-col';
    priceLabel.innerHTML = '<span class="cell-label">Pris</span>';
    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.className = 'price mat-price';
    priceInput.dataset.id = item.id;
    priceInput.inputMode = 'decimal';
    const hasPrice = item.price !== null && item.price !== undefined && item.price !== '';
    const priceValue = hasPrice ? toNumber(item.price) : '';
    priceInput.dataset.price = hasPrice ? String(priceValue) : '';
    if (item.manual) {
      priceInput.placeholder = 'Pris';
      priceInput.value = hasPrice ? String(item.price) : '';
      priceInput.readOnly = false;
    } else {
      priceInput.value = hasPrice ? priceValue.toFixed(2) : '0.00';
      priceInput.readOnly = !admin;
    }
    priceLabel.appendChild(priceInput);

    const lineLabel = document.createElement('label');
    lineLabel.className = 'mat-line-col';
    lineLabel.innerHTML = '<span class="cell-label">Linjetotal</span>';
    const lineInput = document.createElement('input');
    lineInput.type = 'text';
    lineInput.className = 'mat-line item-total';
    lineInput.readOnly = true;
    lineInput.value = `${formatCurrency(toNumber(item.price) * toNumber(item.quantity))} kr`;
    lineLabel.appendChild(lineInput);

    row.appendChild(nameLabel);
    row.appendChild(qtyLabel);
    row.appendChild(priceLabel);
    row.appendChild(lineLabel);

    list.appendChild(row);
  });

  updateTotals(true);
}

// --- Update Functions ---
function handleOptaellingInput(event) {
  const target = event.target;
  if (!target || !target.classList) return;
  if (target.classList.contains('qty')) {
    handleQuantityChange(event);
  } else if (target.classList.contains('price')) {
    handlePriceChange(event);
  } else if (target.classList.contains('manual-name')) {
    handleManualNameChange(event);
  }
}

function handleQuantityChange(event) {
  const { id } = event.target.dataset;
  updateQty(id, event.target.value);
}

function handlePriceChange(event) {
  const { id } = event.target.dataset;
  updatePrice(id, event.target.value);
}

function handleManualNameChange(event) {
  const { id } = event.target.dataset;
  const item = findMaterialById(id);
  if (item && item.manual) {
    item.name = event.target.value;
  }
}

function findMaterialRowElement(id) {
  const rows = document.querySelectorAll('.material-row');
  return Array.from(rows).find(row =>
    Array.from(row.querySelectorAll('input[data-id]')).some(input => input.dataset.id === String(id))
  ) || null;
}

function updateQty(id, val) {
  const item = findMaterialById(id);
  if (!item) return;
  item.quantity = toNumber(val);
  refreshMaterialRowDisplay(id);
  updateTotals();
}

function updatePrice(id, val) {
  const item = findMaterialById(id);
  if (!item) return;
  if (!item.manual && !admin) return;
  item.price = toNumber(val);
  refreshMaterialRowDisplay(id);
  updateTotals();
}

function refreshMaterialRowDisplay(id) {
  const item = findMaterialById(id);
  if (!item) return;
  const row = findMaterialRowElement(id);
  if (!row) return;

  const qtyInput = row.querySelector('input.qty');
  if (qtyInput && document.activeElement !== qtyInput) {
    if (item.manual) {
      const hasQuantity = item.quantity !== null && item.quantity !== undefined && item.quantity !== '';
      qtyInput.value = hasQuantity ? String(item.quantity) : '';
    } else {
      const qtyValue = item.quantity != null ? item.quantity : 0;
      qtyInput.value = String(qtyValue);
    }
  }

  const priceInput = row.querySelector('input.price');
  if (priceInput && document.activeElement !== priceInput) {
    if (item.manual) {
      priceInput.value = item.price ? item.price : '';
      priceInput.readOnly = false;
    } else {
      const priceValue = toNumber(item.price);
      priceInput.value = Number.isFinite(priceValue) ? priceValue.toFixed(2) : '0.00';
      priceInput.readOnly = !admin;
    }
    const hasPrice = item.price !== null && item.price !== undefined && item.price !== '';
    const priceValue = hasPrice ? toNumber(item.price) : '';
    priceInput.dataset.price = hasPrice ? String(priceValue) : '';
  }

  const lineInput = row.querySelector('.mat-line');
  if (lineInput) {
    if (typeof window !== 'undefined' && typeof window.updateMaterialLine === 'function') {
      window.updateMaterialLine(row, { formatPrice: true, shouldUpdateTotals: false });
    } else {
      lineInput.value = `${formatCurrency(toNumber(item.price) * toNumber(item.quantity))} kr`;
    }
  }
}

function calcMaterialesum() {
  return getAllData().reduce((sum, item) => {
    const line = toNumber(item.price) * toNumber(item.quantity);
    return sum + line;
  }, 0);
}

function calcLoensum() {
  if (!Array.isArray(laborEntries) || laborEntries.length === 0) {
    return 0;
  }
  return laborEntries.reduce((sum, entry) => {
    const hours = toNumber(entry.hours);
    const rate = toNumber(entry.rate);
    return sum + hours * rate;
  }, 0);
}

function renderCurrency(target, value) {
  let elements = [];
  if (typeof target === 'string') {
    elements = Array.from(document.querySelectorAll(target));
  } else if (target instanceof Element) {
    elements = [target];
  } else if (target && typeof target.length === 'number') {
    elements = Array.from(target);
  }
  if (elements.length === 0) return;
  const text = `${formatCurrency(value)} kr`;
  elements.forEach(el => {
    el.textContent = text;
  });
}

let totalsUpdateTimer = null;

function updateTralleStateFromInputs() {
  if (typeof window === 'undefined') return;
  const n35 = toNumber(document.getElementById('traelleloeft35')?.value);
  const n50 = toNumber(document.getElementById('traelleloeft50')?.value);
  window.__traelleloeft = {
    n35,
    n50,
    RATE35: TRAELLE_RATE35,
    RATE50: TRAELLE_RATE50,
    sum: (n35 * TRAELLE_RATE35) + (n50 * TRAELLE_RATE50),
  };
}

function performTotalsUpdate() {
  updateTralleStateFromInputs();
  const tralleState = typeof window !== 'undefined' ? window.__traelleloeft : null;
  const tralleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;
  const materialSum = calcMaterialesum() + tralleSum;
  lastMaterialSum = materialSum;
  renderCurrency('[data-total="material"]', materialSum);

  const laborSum = calcLoensum();
  lastLoensum = laborSum;
  renderCurrency('[data-total="labor"]', laborSum);

  renderCurrency('[data-total="project"]', materialSum + laborSum);

  const montageField = document.getElementById('montagepris');
  if (montageField) {
    montageField.value = materialSum.toFixed(2);
  }
  const demontageField = document.getElementById('demontagepris');
  if (demontageField) {
    demontageField.value = (materialSum * 0.5).toFixed(2);
  }

  if (typeof updateSelectedSummary === 'function') {
    updateSelectedSummary();
  }
  if (typeof updateMaterialVisibility === 'function') {
    updateMaterialVisibility();
  }
}

function updateSelectedSummary() {
  const summaryEl = document.getElementById('selectedItemsSummary');
  const rows = document.querySelectorAll('#optaellingContainer .material-row');
  const selected = [];

  rows.forEach(row => {
    const nameElement = row.querySelector('.item-name') || row.querySelector('.manual-name');
    let name = '';
    if (nameElement) {
      if (nameElement instanceof HTMLInputElement || nameElement instanceof HTMLTextAreaElement) {
        name = nameElement.value?.trim() || '';
      } else {
        name = nameElement.textContent?.trim() || '';
      }
    }
    const qtyInput = row.querySelector('input.qty,input.quantity');
    const qty = parseFloat(qtyInput?.value || '0') || 0;
    if (qty > 0) {
      selected.push({ name, qty });
    }
  });

  if (!summaryEl) return;

  if (!selected.length) {
    summaryEl.style.display = 'none';
    summaryEl.innerHTML = '';
    return;
  }

  summaryEl.style.display = 'block';
  summaryEl.innerHTML = `
    <fieldset>
      <legend>Valgte materialer</legend>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${selected.map(s => `
          <span style="background:#2f3238;border:1px solid #3b3d45;border-radius:6px;padding:6px 10px;">
            ${s.name} — ${formatNumber(s.qty)}
          </span>
        `).join('')}
      </div>
    </fieldset>
  `;
}

function updateMaterialVisibility() {
  const showSelectedOnly = document.getElementById('showSelectedOnly');
  const only = !!showSelectedOnly?.checked;
  const rows = document.querySelectorAll('#optaellingContainer .material-row');

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('input.qty,input.quantity')?.value || '0') || 0;
    row.style.display = (!only || qty > 0) ? '' : 'none';
  });
}

function updateTotals(options = {}) {
  const immediate = options === true || options?.immediate;
  if (immediate) {
    if (totalsUpdateTimer) {
      clearTimeout(totalsUpdateTimer);
      totalsUpdateTimer = null;
    }
    performTotalsUpdate();
    return;
  }

  if (totalsUpdateTimer) {
    clearTimeout(totalsUpdateTimer);
  }
  totalsUpdateTimer = setTimeout(() => {
    totalsUpdateTimer = null;
    performTotalsUpdate();
  }, 80);
}

function updateTotal() {
  updateTotals();
}

const sagsinfoFieldIds = ['sagsnummer', 'sagsnavn', 'sagsadresse', 'sagskunde', 'sagsdato', 'sagsmontoer'];

function collectSagsinfo() {
  return {
    sagsnummer: document.getElementById('sagsnummer')?.value.trim() || '',
    navn: document.getElementById('sagsnavn')?.value.trim() || '',
    adresse: document.getElementById('sagsadresse')?.value.trim() || '',
    kunde: document.getElementById('sagskunde')?.value.trim() || '',
    dato: document.getElementById('sagsdato')?.value || '',
    montoer: document.getElementById('sagsmontoer')?.value.trim() || '',
    status: currentStatus,
  };
}

function setSagsinfoField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
}

function updateActionHint(message = '', variant = 'info') {
  const hint = document.getElementById('actionHint');
  if (!hint) return;
  hint.classList.remove('error', 'success');
  if (!message) {
    hint.textContent = DEFAULT_ACTION_HINT;
    hint.style.display = 'none';
    return;
  }
  hint.textContent = message;
  if (variant === 'error') {
    hint.classList.add('error');
  } else if (variant === 'success') {
    hint.classList.add('success');
  }
  hint.style.display = '';
}

function formatStatusLabel(status) {
  const normalized = (status || '').toLowerCase();
  const labels = {
    kladde: 'Kladde',
    afventer: 'Afventer',
    godkendt: 'Godkendt',
    afvist: 'Afvist',
  };
  if (labels[normalized]) return labels[normalized];
  if (!normalized) return 'Kladde';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function syncStatusUI(status) {
  const indicator = document.getElementById('statusIndicator');
  if (indicator) {
    indicator.textContent = formatStatusLabel(status);
    indicator.dataset.status = status || 'kladde';
  }
  const select = document.getElementById('sagStatus');
  if (select && (status ?? '') !== select.value) {
    select.value = status || 'kladde';
  }
}

function updateStatus(value, options = {}) {
  const next = (value || '').toLowerCase() || 'kladde';
  if (!admin && (next === 'godkendt' || next === 'afvist')) {
    if (options?.source === 'control') {
      syncStatusUI(currentStatus);
    }
    updateActionHint('Kun kontor kan godkende/afvise.', 'error');
    return;
  }
  currentStatus = next;
  syncStatusUI(currentStatus);
}

function initStatusControls() {
  syncStatusUI(currentStatus);
  const select = document.getElementById('sagStatus');
  if (select) {
    select.addEventListener('change', event => {
      updateStatus(event.target.value, { source: 'control' });
    });
  }
}

function promisifyRequest(request) {
  if (!request) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDB() {
  if (cachedDBPromise) return cachedDBPromise;
  if (typeof indexedDB === 'undefined') {
    cachedDBPromise = Promise.reject(new Error('IndexedDB er ikke tilgængelig'));
    cachedDBPromise.catch(() => {});
    return cachedDBPromise;
  }
  cachedDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = event => {
      const db = event.target?.result;
      if (db && !db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB kunne ikke åbnes'));
  });
  cachedDBPromise.catch(() => {
    cachedDBPromise = null;
  });
  return cachedDBPromise;
}

async function saveProject(data) {
  if (!data) return;
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(DB_STORE, 'readwrite');
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Transaktionen blev afbrudt'));
      tx.onerror = () => reject(tx.error || new Error('Transaktionen fejlede'));
    });
    const store = tx.objectStore(DB_STORE);
    await promisifyRequest(store.add({ data, ts: Date.now() }));
    const all = await promisifyRequest(store.getAll());
    if (Array.isArray(all) && all.length > 20) {
      all.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const excess = all.length - 20;
      for (let index = 0; index < excess; index += 1) {
        const item = all[index];
        if (item && item.id != null) {
          await promisifyRequest(store.delete(item.id));
        }
      }
    }
    await completion;
  } catch (error) {
    console.warn('Kunne ikke gemme sag lokalt', error);
  }
}

async function getRecentProjects() {
  try {
    const db = await openDB();
    if (!db) return [];
    const tx = db.transaction(DB_STORE, 'readonly');
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Transaktionen blev afbrudt'));
      tx.onerror = () => reject(tx.error || new Error('Transaktionen fejlede'));
    });
    const store = tx.objectStore(DB_STORE);
    const items = await promisifyRequest(store.getAll());
    await completion;
    if (!Array.isArray(items)) return [];
    return items
      .filter(entry => entry && entry.data)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  } catch (error) {
    console.warn('Kunne ikke hente lokale sager', error);
    return [];
  }
}

async function populateRecentCases() {
  const select = document.getElementById('recentCases');
  if (!select) return;
  const button = document.getElementById('btnLoadCase');
  const cases = await getRecentProjects();
  recentCasesCache = cases;
  select.innerHTML = '';

  if (!cases.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Ingen gemte sager endnu';
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
    if (button) button.disabled = true;
    return;
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Vælg gemt sag';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  cases.forEach(entry => {
    const option = document.createElement('option');
    option.value = String(entry.id);
    const info = entry.data?.sagsinfo || {};
    const parts = [];
    if (info.sagsnummer) parts.push(info.sagsnummer);
    if (info.navn) parts.push(info.navn);
    option.textContent = parts.length ? parts.join(' – ') : `Sag #${entry.id}`;
    select.appendChild(option);
  });

  if (button) button.disabled = true;
}

function collectExtrasState() {
  const getValue = id => document.getElementById(id)?.value ?? '';
  return {
    jobType: document.getElementById('jobType')?.value || 'montage',
    montagepris: getValue('montagepris'),
    demontagepris: getValue('demontagepris'),
    slaebePct: getValue('slaebePct'),
    antalBoringHuller: getValue('antalBoringHuller'),
    antalLukHuller: getValue('antalLukHuller'),
    antalBoringBeton: getValue('antalBoringBeton'),
    km: getValue('km'),
    traelle35: getValue('traelleloeft35'),
    traelle50: getValue('traelleloeft50'),
  };
}

function collectProjectSnapshot() {
  const materials = getAllData().map(item => ({
    id: item.id,
    name: item.name,
    price: toNumber(item.price),
    quantity: toNumber(item.quantity),
    manual: Boolean(item.manual),
    varenr: item.varenr || null,
  }));
  const labor = Array.isArray(laborEntries)
    ? laborEntries.map(entry => ({ ...entry }))
    : [];
  return {
    timestamp: Date.now(),
    status: currentStatus,
    sagsinfo: collectSagsinfo(),
    systems: Array.from(selectedSystemKeys),
    materials,
    labor,
    extras: collectExtrasState(),
    totals: {
      materialSum: lastMaterialSum,
      laborSum: lastLoensum,
    },
  };
}

async function persistProjectSnapshot() {
  try {
    const snapshot = collectProjectSnapshot();
    await saveProject(snapshot);
    await populateRecentCases();
  } catch (error) {
    console.warn('Kunne ikke gemme projekt snapshot', error);
  }
}

function applyExtrasSnapshot(extras = {}) {
  const assign = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };
  const jobType = document.getElementById('jobType');
  if (jobType && extras.jobType) {
    jobType.value = extras.jobType;
  }
  assign('montagepris', extras.montagepris);
  assign('demontagepris', extras.demontagepris);
  assign('slaebePct', extras.slaebePct);
  assign('antalBoringHuller', extras.antalBoringHuller);
  assign('antalLukHuller', extras.antalLukHuller);
  assign('antalBoringBeton', extras.antalBoringBeton);
  assign('km', extras.km);
  assign('traelleloeft35', extras.traelle35);
  assign('traelleloeft50', extras.traelle50);

  if (typeof window !== 'undefined') {
    const n35 = toNumber(extras.traelle35);
    const n50 = toNumber(extras.traelle50);
    const sum = (n35 * TRAELLE_RATE35) + (n50 * TRAELLE_RATE50);
    window.__traelleloeft = {
      n35,
      n50,
      RATE35: TRAELLE_RATE35,
      RATE50: TRAELLE_RATE50,
      sum,
    };
  }
}

function applyMaterialsSnapshot(materials = [], systems = []) {
  resetMaterials();
  if (Array.isArray(systems) && systems.length) {
    selectedSystemKeys.clear();
    systems.forEach(key => selectedSystemKeys.add(key));
  }
  if (Array.isArray(materials)) {
    materials.forEach(item => {
      const quantity = toNumber(item?.quantity);
      const price = toNumber(item?.price);
      let target = null;
      if (item?.id) {
        target = findMaterialById(item.id);
      }
      if (target && !target.manual) {
        target.quantity = quantity;
        if (Number.isFinite(price) && price > 0) {
          target.price = price;
        }
        return;
      }
      if (item?.manual) {
        const slot = manualMaterials.find(man => man.id === item.id)
          || manualMaterials.find(man => !man.name && man.quantity === 0 && man.price === 0);
        if (slot) {
          slot.name = item.name || slot.name;
          slot.price = Number.isFinite(price) ? price : slot.price;
          slot.quantity = quantity;
        }
        return;
      }
      const fallback = manualMaterials.find(man => !man.name && man.quantity === 0 && man.price === 0);
      if (fallback) {
        fallback.name = item?.name || '';
        fallback.price = Number.isFinite(price) ? price : 0;
        fallback.quantity = quantity;
      }
    });
  }
  renderOptaelling();
}

function applyLaborSnapshot(labor = []) {
  if (Array.isArray(labor)) {
    laborEntries = labor.map(entry => ({ ...entry }));
  } else {
    laborEntries = [];
  }
  populateWorkersFromLabor(laborEntries);
}

function applyProjectSnapshot(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const info = snapshot.sagsinfo || {};
  setSagsinfoField('sagsnummer', info.sagsnummer || '');
  setSagsinfoField('sagsnavn', info.navn || '');
  setSagsinfoField('sagsadresse', info.adresse || '');
  setSagsinfoField('sagskunde', info.kunde || '');
  setSagsinfoField('sagsdato', info.dato || '');
  setSagsinfoField('sagsmontoer', info.montoer || '');

  if (info.status || snapshot.status) {
    currentStatus = (info.status || snapshot.status || 'kladde').toLowerCase();
    syncStatusUI(currentStatus);
  } else {
    syncStatusUI(currentStatus);
  }

  applyMaterialsSnapshot(snapshot.materials, snapshot.systems);
  applyExtrasSnapshot(snapshot.extras);
  applyLaborSnapshot(snapshot.labor);

  if (snapshot.totals) {
    if (Number.isFinite(snapshot.totals.materialSum)) {
      lastMaterialSum = snapshot.totals.materialSum;
    }
    if (Number.isFinite(snapshot.totals.laborSum)) {
      lastLoensum = snapshot.totals.laborSum;
    }
  }

  updateTotals(true);
  validateSagsinfo();
  if (!options?.skipHint) {
    updateActionHint('Sag er indlæst.', 'success');
  }
}

async function handleLoadCase() {
  const select = document.getElementById('recentCases');
  if (!select) return;
  const value = Number(select.value);
  if (!Number.isFinite(value) || value <= 0) return;
  let record = recentCasesCache.find(entry => Number(entry.id) === value);
  if (!record) {
    const cases = await getRecentProjects();
    recentCasesCache = cases;
    record = cases.find(entry => Number(entry.id) === value);
  }
  if (record && record.data) {
    applyProjectSnapshot(record.data, { skipHint: false });
  } else {
    updateActionHint('Kunne ikke indlæse den valgte sag.', 'error');
  }
}

function validateSagsinfo() {
  let isValid = true;
  sagsinfoFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rawValue = (el.value || '').trim();
    let fieldValid = rawValue.length > 0;
    if (id === 'sagsdato') {
      fieldValid = rawValue.length > 0 && !Number.isNaN(new Date(rawValue).valueOf());
    }
    if (!fieldValid) {
      isValid = false;
    }
    el.classList.toggle('invalid', !fieldValid);
  });

  ['btnExportCSV', 'btnExportAll', 'btnExportZip', 'btnPrint'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !isValid;
  });

  if (isValid) {
    updateActionHint('');
  } else {
    updateActionHint(DEFAULT_ACTION_HINT, 'error');
  }

  return isValid;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeFilename(value) {
  return (value || 'akkordseddel')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9-_]+/gi, '_');
}

function formatNumberForCSV(value) {
  return toNumber(value).toFixed(2).replace('.', ',');
}

function formatPercentForCSV(value) {
  const num = toNumber(value);
  return `${num.toFixed(2).replace('.', ',')} %`;
}

function formatDateForDisplay(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.valueOf())) {
    return date.toLocaleDateString('da-DK');
  }
  return String(value);
}

function setEkompletStatus(message, variant = 'success') {
  const statusEl = document.getElementById('ekompletStatus');
  if (!statusEl) return;
  statusEl.classList.remove('success', 'error');
  if (!message) {
    statusEl.textContent = '';
    statusEl.setAttribute('hidden', '');
    return;
  }
  if (variant === 'success') {
    statusEl.classList.add('success');
  } else if (variant === 'error') {
    statusEl.classList.add('error');
  }
  statusEl.textContent = message;
  statusEl.removeAttribute('hidden');
}

function normalizeDateValue(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[-\/.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
    if (c.length === 4) {
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

function parseCSV(text) {
  const lines = String(text).split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';

  const parseLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every(cell => cell === '')) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function resetMaterials() {
  [dataBosta, dataHaki, dataModex, dataAlfix].forEach(list => {
    list.forEach(item => {
      item.quantity = 0;
    });
  });
  manualMaterials.forEach(item => {
    item.name = '';
    item.price = 0;
    item.quantity = 0;
  });
}

function resetWorkers() {
  workerCount = 0;
  const container = document.getElementById('workers');
  if (container) {
    container.innerHTML = '';
  }
}

function populateWorkersFromLabor(entries) {
  resetWorkers();
  if (!Array.isArray(entries) || entries.length === 0) {
    addWorker();
    return;
  }
  entries.forEach((entry, index) => {
    addWorker();
    const worker = document.getElementById(`worker${index + 1}`);
    if (!worker) return;
    const hoursInput = worker.querySelector('.worker-hours');
    const tillaegInput = worker.querySelector('.worker-tillaeg');
    if (hoursInput) hoursInput.value = toNumber(entry.hours);
    if (tillaegInput) tillaegInput.value = 0;
  });
}

function matchMaterialByName(name) {
  if (!name) return null;
  const targetKey = normalizeKey(name);
  const allLists = [dataBosta, dataHaki, dataModex, dataAlfix, manualMaterials];
  for (const list of allLists) {
    const match = list.find(item => normalizeKey(item.name) === targetKey);
    if (match) return match;
  }
  return null;
}

function assignMaterialRow(row) {
  const idValue = row.id?.trim?.() || '';
  const nameValue = row.name?.trim?.() || '';
  const qty = toNumber(row.quantity);
  const price = toNumber(row.price);
  if (!nameValue && !idValue && qty === 0 && price === 0) return;

  let target = null;
  if (idValue) {
    target = findMaterialById(idValue);
  }
  if (!target && nameValue) {
    target = matchMaterialByName(nameValue);
  }

  if (target && !target.manual) {
    target.quantity = qty;
    if (price > 0) target.price = price;
    return;
  }

  const receiver = manualMaterials.find(item => !item.name && item.quantity === 0 && item.price === 0);
  if (!receiver) return;
  const manualIndex = manualMaterials.indexOf(receiver) + 1;
  receiver.name = nameValue || receiver.name || `Manuelt materiale ${manualIndex}`;
  receiver.quantity = qty;
  receiver.price = price;
}

function applyCSVRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  resetMaterials();

  const info = collectSagsinfo();
  const montorValues = [];
  const materials = [];
  const labor = [];

  rows.forEach(row => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeKey(key)] = (value ?? '').toString().trim();
    });

    const sagsnummerVal = normalized['sagsnummer'] || normalized['sagsnr'] || normalized['sag'] || normalized['caseid'];
    if (sagsnummerVal) info.sagsnummer = sagsnummerVal;

    const navnVal = normalized['navnopgave'] || normalized['navn'] || normalized['opgave'] || normalized['projekt'];
    if (navnVal) info.navn = navnVal;

    const adresseVal = normalized['adresse'] || normalized['addresse'];
    if (adresseVal) info.adresse = adresseVal;

    const kundeVal = normalized['kunde'] || normalized['customer'];
    if (kundeVal) info.kunde = kundeVal;

    const datoVal = normalizeDateValue(normalized['dato'] || normalized['date']);
    if (datoVal) info.dato = datoVal;

    const montorVal = normalized['montoer'] || normalized['montor'] || normalized['montornavne'] || normalized['montornavn'];
    if (montorVal) montorValues.push(montorVal);

    const matName = normalized['materialenavn'] || normalized['materiale'] || normalized['varenavn'] || normalized['navn'];
    const matQty = normalized['antal'] || normalized['quantity'] || normalized['qty'] || normalized['maengde'];
    const matPrice = normalized['pris'] || normalized['price'] || normalized['enhedspris'] || normalized['stkpris'];
    const matId = normalized['id'] || normalized['materialeid'] || normalized['varenummer'];
    if (matName || matId || matQty || matPrice) {
      materials.push({ id: matId, name: matName, quantity: matQty, price: matPrice });
    }

    const laborType = normalized['arbejdstype'] || normalized['type'] || normalized['jobtype'];
    const laborHours = normalized['timer'] || normalized['hours'] || normalized['antalttimer'];
    const laborRate = normalized['sats'] || normalized['rate'] || normalized['timelon'] || normalized['timeloen'];
    if (laborType || laborHours || laborRate) {
      labor.push({ type: laborType || '', hours: toNumber(laborHours), rate: toNumber(laborRate) });
    }
  });

  setSagsinfoField('sagsnummer', info.sagsnummer || '');
  setSagsinfoField('sagsnavn', info.navn || '');
  setSagsinfoField('sagsadresse', info.adresse || '');
  setSagsinfoField('sagskunde', info.kunde || '');
  setSagsinfoField('sagsdato', info.dato || '');

  if (montorValues.length) {
    const names = montorValues
      .flatMap(value => value.split(/[\n,]/))
      .map(name => name.trim())
      .filter(Boolean)
      .join('\n');
    setSagsinfoField('sagsmontoer', names);
  }

  materials.forEach(assignMaterialRow);

  const systemsWithQuantities = systemOptions.filter(option =>
    option.dataset.some(item => toNumber(item.quantity) > 0)
  );
  if (systemsWithQuantities.length > 0) {
    selectedSystemKeys.clear();
    systemsWithQuantities.forEach(option => selectedSystemKeys.add(option.key));
  }

  renderOptaelling();

  laborEntries = labor.filter(entry => entry.hours > 0 || entry.rate > 0 || entry.type);
  populateWorkersFromLabor(laborEntries);
  updateTotals(true);

  if (laborEntries.length > 0) {
    const firstType = laborEntries[0].type?.toLowerCase() || '';
    const jobSelect = document.getElementById('jobType');
    if (jobSelect) {
      if (firstType.includes('demo')) jobSelect.value = 'demontage';
      else if (firstType.includes('montage')) jobSelect.value = 'montage';
    }
  }

  validateSagsinfo();
}

function setupCSVImport() {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('csvFileInput');
  if (!dropArea || !fileInput) return;

  const openPicker = () => fileInput.click();

  ['dragenter', 'dragover'].forEach(evt => {
    dropArea.addEventListener(evt, event => {
      event.preventDefault();
      dropArea.classList.add('dragover');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropArea.addEventListener(evt, () => dropArea.classList.remove('dragover'));
  });

  dropArea.addEventListener('drop', event => {
    event.preventDefault();
    dropArea.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleImportFile(file);
      fileInput.value = '';
    }
  });

  dropArea.addEventListener('click', openPicker);
  dropArea.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  });

  fileInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportFile(file);
      fileInput.value = '';
    }
  });
}

function handleImportFile(file) {
  if (!file) return;
  const fileName = file.name || '';
  if (/\.json$/i.test(fileName) || (file.type && file.type.includes('json'))) {
    importJSONProject(file);
    return;
  }
  uploadCSV(file);
}

// --- Authentication ---
function login() {
  const codeInput = document.getElementById('adminCode');
  const feedback = document.getElementById('adminFeedback');
  if (!codeInput) return;

  const isValid = codeInput.value.trim() === 'StilAce';
  if (isValid) {
    admin = true;
    codeInput.value = '';
    feedback?.classList.remove('error');
    feedback?.classList.add('success');
    if (feedback) {
      feedback.textContent = 'Admin-tilstand aktiveret. Prisfelter er nu redigerbare.';
      feedback.removeAttribute('hidden');
    }
    renderOptaelling();
    updateTotals(true);
  } else {
    if (feedback) {
      feedback.textContent = 'Forkert kode. Prøv igen.';
      feedback.classList.remove('success');
      feedback.classList.add('error');
      feedback.removeAttribute('hidden');
    }
  }
}

// --- Worker Functions ---
function addWorker() {
  workerCount++;
  const w = document.createElement("fieldset");
  w.className = "worker-row";
  w.id = `worker${workerCount}`;
  w.innerHTML = `
    <legend>Mand ${workerCount}</legend>
    <div class="worker-grid">
      <label>
        <span>Timer</span>
        <input type="number" class="worker-hours" value="0" min="0" step="0.25" inputmode="decimal">
      </label>
      <label>
        <span>Uddannelse</span>
        <select class="worker-udd">
          <option value="udd1">Udd1 (42,98 kr)</option>
          <option value="udd2">Udd2 (49,38 kr)</option>
        </select>
      </label>
      <label>
        <span>Mentortillæg (22,26 kr/t)</span>
        <input type="number" class="worker-tillaeg" value="0" min="0" step="0.01" inputmode="decimal">
      </label>
    </div>
    <div class="worker-output" aria-live="polite"></div>
  `;
  document.getElementById("workers").appendChild(w);
}


// Debounce funktion til performance
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Async storage helpers
async function saveLocalData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

async function loadLocalData(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function beregnLon() {
  const info = collectSagsinfo();
  const sagsnummer = info.sagsnummer?.trim() || 'uspecified';
  const montagepris = parseFloat(document.getElementById('montagepris')?.value) || 0;
  const demontagepris = parseFloat(document.getElementById('demontagepris')?.value) || 0;
  const slaebePctInput = parseFloat(document.getElementById('slaebePct')?.value) || 0;
  const slaebePct = slaebePctInput / 100;
  const jobType = document.getElementById('jobType')?.value || 'montage';

  const boringHullerPris = 4.70;
  const lukHullerPris = 3.45;
  const boringBetonPris = 11.49;
  const kmPris = 2.12;
  const grundloen = 147;
  const tillægUdd1 = 42.98;
  const tillægUdd2 = 49.38;
  lastEkompletData = null;

  const antalBoringHuller = parseFloat(document.getElementById('antalBoringHuller')?.value) || 0;
  const antalLukHuller = parseFloat(document.getElementById('antalLukHuller')?.value) || 0;
  const antalBoringBeton = parseFloat(document.getElementById('antalBoringBeton')?.value) || 0;
  const antalKm = parseFloat(document.getElementById('km')?.value) || 0;

  const traelle35 = parseFloat(document.getElementById('traelleloeft35')?.value) || 0;
  const traelle50 = parseFloat(document.getElementById('traelleloeft50')?.value) || 0;

  const boringHullerTotal = antalBoringHuller * boringHullerPris;
  const lukHullerTotal = antalLukHuller * lukHullerPris;
  const boringBetonTotal = antalBoringBeton * boringBetonPris;
  const kilometerPris = antalKm * kmPris;
  const slaebebelob = montagepris * slaebePct; // Slæb beregnes altid ud fra montagepris
  const traelle35Total = traelle35 * TRAELLE_RATE35;
  const traelle50Total = traelle50 * TRAELLE_RATE50;
  const traelleSum = traelle35Total + traelle50Total;

  if (typeof window !== 'undefined') {
    window.__traelleloeft = {
      n35: traelle35,
      n50: traelle50,
      RATE35: TRAELLE_RATE35,
      RATE50: TRAELLE_RATE50,
      sum: traelleSum,
    };
  }

  let materialeTotal = 0;
  const materialLines = [];
  const materialerTilEkomplet = [];
  const allData = getAllData();
  if (Array.isArray(allData)) {
    allData.forEach(item => {
      const qty = toNumber(item.quantity);
      if (qty <= 0) return;
      const price = toNumber(item.price);
      const baseTotal = qty * price;
      const lineTotal = jobType === 'montage' ? baseTotal : baseTotal / 2;
      const adjustedUnitPrice = qty > 0 ? lineTotal / qty : price;
      materialeTotal += lineTotal;
      const manualIndex = manualMaterials.indexOf(item);
      const label = item.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item.name;
      materialLines.push({
        label,
        quantity: qty,
        unitPrice: price,
        lineTotal,
      });
      materialerTilEkomplet.push({
        varenr: item.varenr || item.id || '',
        name: label,
        quantity: qty,
        unitPrice: adjustedUnitPrice,
        baseUnitPrice: price,
        lineTotal,
      });
    });
  }

  const ekstraarbejde = boringHullerTotal + lukHullerTotal + boringBetonTotal + traelleSum;
  const samletAkkordSum = materialeTotal + ekstraarbejde + kilometerPris + slaebebelob;

  const workers = document.querySelectorAll('.worker-row');
  let samletTimer = 0;
  const workerLines = [];
  let samletUdbetalt = 0;
  const beregnedeArbejdere = [];

  workers.forEach(worker => {
    const hoursEl = worker.querySelector('.worker-hours');
    const hours = parseFloat(hoursEl?.value) || 0;
    if (hours === 0) return;
    samletTimer += hours;
  });

  if (samletTimer === 0) {
    const resultatDiv = document.getElementById('lonResult');
    if (resultatDiv) {
      resultatDiv.innerHTML = '';
      const message = document.createElement('div');
      message.style.color = 'red';
      message.textContent = 'Indtast arbejdstimer for mindst én person';
      resultatDiv.appendChild(message);
    }
    laborEntries = [];
    return;
  }

  const akkordTimeLøn = samletAkkordSum / samletTimer;

  workers.forEach((worker, index) => {
    const hours = parseFloat(worker.querySelector('.worker-hours')?.value) || 0;
    if (hours === 0) return;
    const tillaeg = parseFloat(worker.querySelector('.worker-tillaeg')?.value) || 0;
    const uddSelect = worker.querySelector('.worker-udd');
    const udd = uddSelect?.value || '';
    const outputEl = worker.querySelector('.worker-output');
    const workerName = worker.querySelector('legend')?.textContent?.trim() || `Mand ${index + 1}`;

    let timelon = akkordTimeLøn;
    let uddannelsesTillaeg = 0;
    timelon += tillaeg;
    if (udd === 'udd1') {
      timelon += tillægUdd1;
      uddannelsesTillaeg = tillægUdd1;
    } else if (udd === 'udd2') {
      timelon += tillægUdd2;
      uddannelsesTillaeg = tillægUdd2;
    }

    const total = timelon * hours;
    samletUdbetalt += total;

    if (outputEl) {
      outputEl.textContent = `${timelon.toFixed(2)} kr/t | Total: ${total.toFixed(2)} kr`;
    }
    workerLines.push({
      name: workerName,
      hours,
      rate: timelon,
      total,
    });
    const uddLabel = uddSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    beregnedeArbejdere.push({
      id: index + 1,
      name: workerName,
      type: jobType,
      hours,
      rate: timelon,
      baseRate: akkordTimeLøn,
      mentortillaeg: tillaeg,
      udd,
      uddLabel,
      uddannelsesTillaeg,
      total,
    });
  });

  const resultatDiv = document.getElementById('lonResult');
  const materialSum = calcMaterialesum() + traelleSum;
  const projektsum = materialSum + samletUdbetalt;
  const datoDisplay = formatDateForDisplay(info.dato);
  if (resultatDiv) {
    resultatDiv.innerHTML = '';

    const sagsSection = document.createElement('div');
    const sagsHeader = document.createElement('h3');
    sagsHeader.textContent = 'Sagsinfo';
    sagsSection.appendChild(sagsHeader);

    const fields = [
      { label: 'Sagsnr.', value: info.sagsnummer || '' },
      { label: 'Navn', value: info.navn || '' },
      { label: 'Adresse', value: info.adresse || '' },
      { label: 'Dato', value: datoDisplay },
      { label: 'Status', value: formatStatusLabel(info.status) },
    ];

    fields.forEach(({ label, value }) => {
      const line = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      line.appendChild(strong);
      const span = document.createElement('span');
      span.textContent = value;
      line.appendChild(span);
      sagsSection.appendChild(line);
    });

    resultatDiv.appendChild(sagsSection);

    const matHeader = document.createElement('h3');
    matHeader.textContent = 'Materialer brugt:';
    resultatDiv.appendChild(matHeader);

    if (materialLines.length > 0) {
      materialLines.forEach(lineItem => {
        const line = document.createElement('div');
        line.textContent = `${lineItem.label}: ${lineItem.quantity} × ${lineItem.unitPrice.toFixed(2)} kr = ${lineItem.lineTotal.toFixed(2)} kr`;
        resultatDiv.appendChild(line);
      });
    } else {
      const none = document.createElement('div');
      none.textContent = 'Ingen materialer brugt';
      resultatDiv.appendChild(none);
    }

    const workersHeader = document.createElement('h3');
    workersHeader.textContent = 'Arbejdere:';
    resultatDiv.appendChild(workersHeader);

    if (workerLines.length > 0) {
      workerLines.forEach(workerLine => {
        const line = document.createElement('div');
        line.textContent = `${workerLine.name}: Timer: ${workerLine.hours}, Timeløn: ${workerLine.rate.toFixed(2)} kr/t, Total: ${workerLine.total.toFixed(2)} kr`;
        resultatDiv.appendChild(line);
      });
    } else {
      const none = document.createElement('div');
      none.textContent = 'Ingen timer registreret';
      resultatDiv.appendChild(none);
    }

    const oversigtHeader = document.createElement('h3');
    oversigtHeader.textContent = 'Oversigt:';
    resultatDiv.appendChild(oversigtHeader);

    const oversigt = [
      ['Slæbebeløb', `${slaebebelob.toFixed(2)} kr`],
      ['Materialer (akkordberegnet)', `${materialeTotal.toFixed(2)} kr`],
      ['Materialesum', `${materialSum.toFixed(2)} kr`],
      ['Ekstraarbejde', `${ekstraarbejde.toFixed(2)} kr`],
      ['Tralleløft', `${traelleSum.toFixed(2)} kr`],
      ['Kilometer', `${kilometerPris.toFixed(2)} kr`],
      ['Samlet akkordsum', `${samletAkkordSum.toFixed(2)} kr`],
      ['Timer', `${samletTimer.toFixed(1)} t`],
      ['Timepris (uden tillæg)', `${akkordTimeLøn.toFixed(2)} kr/t`],
      ['Lønsum', `${samletUdbetalt.toFixed(2)} kr`],
      ['Projektsum', `${projektsum.toFixed(2)} kr`],
    ];

    oversigt.forEach(([label, value]) => {
      const line = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      line.appendChild(strong);
      const span = document.createElement('span');
      span.textContent = value;
      line.appendChild(span);
      resultatDiv.appendChild(line);
    });

    const actions = document.createElement('div');
    actions.className = 'ekomplet-actions no-print';

    const btn = document.createElement('button');
    btn.id = 'btnEkompletExport';
    btn.type = 'button';
    btn.textContent = 'Indberet til E-komplet';
    actions.appendChild(btn);

    const status = document.createElement('p');
    status.id = 'ekompletStatus';
    status.className = 'status-message';
    status.hidden = true;
    status.setAttribute('aria-live', 'polite');
    actions.appendChild(status);

    resultatDiv.appendChild(actions);
  }

  laborEntries = beregnedeArbejdere;

  lastEkompletData = {
    sagsinfo: info,
    jobType,
    montagepris,
    demontagepris,
    extras: {
      slaebePct: slaebePctInput,
      slaebeBelob: slaebebelob,
      boringHuller: { antal: antalBoringHuller, pris: boringHullerPris, total: boringHullerTotal },
      lukHuller: { antal: antalLukHuller, pris: lukHullerPris, total: lukHullerTotal },
      boringBeton: { antal: antalBoringBeton, pris: boringBetonPris, total: boringBetonTotal },
      kilometer: { antal: antalKm, pris: kmPris, total: kilometerPris },
      traelleloeft: {
        antal35: traelle35,
        pris35: TRAELLE_RATE35,
        total35: traelle35Total,
        antal50: traelle50,
        pris50: TRAELLE_RATE50,
        total50: traelle50Total,
        total: traelleSum,
      },
    },
    materialer: materialerTilEkomplet,
    arbejdere: beregnedeArbejdere,
    totals: {
      materialeAkkord: materialeTotal,
      ekstraarbejde,
      kilometerPris,
      slaebeBelob: slaebebelob,
      akkordsum: samletAkkordSum,
      timer: samletTimer,
      akkordTimeLon: akkordTimeLøn,
      loensum: samletUdbetalt,
      projektsum,
      materialSum,
      traelleSum,
    },
    traelle: {
      antal35: traelle35,
      antal50: traelle50,
      rate35: TRAELLE_RATE35,
      rate50: TRAELLE_RATE50,
      sum: traelleSum,
    },
  };

  updateTotals(true);
  attachEkompletButton();

  if (typeof window !== 'undefined') {
    window.__beregnLonCache = {
      materialSum: lastMaterialSum,
      laborSum: lastLoensum,
      projectSum: lastMaterialSum + lastLoensum,
      traelleSum,
      timestamp: Date.now(),
    };
  }

  persistProjectSnapshot();

  return sagsnummer;
}


function attachEkompletButton() {
  const button = document.getElementById('btnEkompletExport');
  if (!button) return;
  button.addEventListener('click', () => downloadEkompletCSV());
}

function downloadEkompletCSV() {
  if (!validateSagsinfo()) {
    setEkompletStatus('Udfyld Sagsinfo før du indberetter til E-komplet.', 'error');
    updateActionHint('Udfyld Sagsinfo for at indberette.', 'error');
    return;
  }

  const data = lastEkompletData;
  if (!data) {
    setEkompletStatus('Beregn løn først, så alle data er opdaterede.', 'error');
    return;
  }

  const rows = [];
  const sagsinfo = data.sagsinfo || {};
  const jobTypeLabel = data.jobType === 'demontage' ? 'Demontage (50%)' : 'Montage';

  rows.push(['Sektion', 'Felt', 'Værdi']);
  rows.push(['Sagsinfo', 'Sagsnummer', sagsinfo.sagsnummer || '']);
  rows.push(['Sagsinfo', 'Navn', sagsinfo.navn || '']);
  rows.push(['Sagsinfo', 'Adresse', sagsinfo.adresse || '']);
  rows.push(['Sagsinfo', 'Dato', formatDateForDisplay(sagsinfo.dato || '')]);
  rows.push([]);

  rows.push(['Materialer', 'Varenr', 'Beskrivelse', 'Antal', 'Sats', 'Linjesum']);
  if (Array.isArray(data.materialer) && data.materialer.length > 0) {
    data.materialer.forEach(item => {
      rows.push([
        'Materiale',
        item.varenr || '',
        item.name || '',
        formatNumberForCSV(item.quantity || 0),
        formatNumberForCSV(item.unitPrice || 0),
        formatNumberForCSV(item.lineTotal || 0),
      ]);
    });
  } else {
    rows.push(['Materiale', '', 'Ingen registrering', '0', '0,00', '0,00']);
  }
  rows.push([]);

  rows.push(['Arbejdere', 'Navn', 'Timer', 'Uddannelse', 'Mentortillæg', 'Udd.tillæg', 'Sats', 'Linjesum']);
  if (Array.isArray(data.arbejdere) && data.arbejdere.length > 0) {
    data.arbejdere.forEach(worker => {
      rows.push([
        'Arbejder',
        worker.name || '',
        formatNumberForCSV(worker.hours || 0),
        worker.uddLabel || worker.udd || '',
        formatNumberForCSV(worker.mentortillaeg || 0),
        formatNumberForCSV(worker.uddannelsesTillaeg || 0),
        formatNumberForCSV(worker.rate || 0),
        formatNumberForCSV(worker.total || 0),
      ]);
    });
  } else {
    rows.push(['Arbejder', 'Ingen timer registreret', '0', '', '0,00', '0,00', '0,00', '0,00']);
  }
  rows.push([]);

  rows.push(['Tillæg', 'Type', 'Antal/Procent', 'Sats', 'Beløb']);
  const extras = data.extras || {};
  rows.push([
    'Tillæg',
    'Slæb',
    formatPercentForCSV(extras.slaebePct || 0),
    formatNumberForCSV(data.montagepris || 0),
    formatNumberForCSV(extras.slaebeBelob || 0),
  ]);
  const boringHuller = extras.boringHuller || {};
  rows.push([
    'Tillæg',
    'Boring af huller',
    formatNumberForCSV(boringHuller.antal || 0),
    formatNumberForCSV(boringHuller.pris || 0),
    formatNumberForCSV(boringHuller.total || 0),
  ]);
  const lukHuller = extras.lukHuller || {};
  rows.push([
    'Tillæg',
    'Luk af hul',
    formatNumberForCSV(lukHuller.antal || 0),
    formatNumberForCSV(lukHuller.pris || 0),
    formatNumberForCSV(lukHuller.total || 0),
  ]);
  const boringBeton = extras.boringBeton || {};
  rows.push([
    'Tillæg',
    'Boring i beton',
    formatNumberForCSV(boringBeton.antal || 0),
    formatNumberForCSV(boringBeton.pris || 0),
    formatNumberForCSV(boringBeton.total || 0),
  ]);
  const kilometer = extras.kilometer || {};
  rows.push([
    'Tillæg',
    'Kilometer',
    formatNumberForCSV(kilometer.antal || 0),
    formatNumberForCSV(kilometer.pris || 0),
    formatNumberForCSV(kilometer.total || 0),
  ]);
  const traelle = data.traelle || {};
  rows.push([
    'Tillæg',
    'Tralleløft 0,35 m',
    formatNumberForCSV(traelle.antal35 || 0),
    formatNumberForCSV(traelle.rate35 || 0),
    formatNumberForCSV((traelle.antal35 || 0) * (traelle.rate35 || 0)),
  ]);
  rows.push([
    'Tillæg',
    'Tralleløft 0,50 m',
    formatNumberForCSV(traelle.antal50 || 0),
    formatNumberForCSV(traelle.rate50 || 0),
    formatNumberForCSV((traelle.antal50 || 0) * (traelle.rate50 || 0)),
  ]);
  rows.push([]);

  rows.push(['Projekt', 'Felt', 'Værdi']);
  rows.push(['Projekt', 'Arbejdstype', jobTypeLabel]);
  rows.push(['Projekt', 'Montagepris', formatNumberForCSV(data.montagepris || 0)]);
  rows.push(['Projekt', 'Demontagepris', formatNumberForCSV(data.demontagepris || 0)]);
  rows.push(['Projekt', 'Materialer (akkord)', formatNumberForCSV(data.totals?.materialeAkkord || 0)]);
  rows.push(['Projekt', 'Materialesum', formatNumberForCSV(data.totals?.materialSum || 0)]);
  rows.push(['Projekt', 'Ekstraarbejde', formatNumberForCSV(data.totals?.ekstraarbejde || 0)]);
  rows.push(['Projekt', 'Kilometer', formatNumberForCSV(data.totals?.kilometerPris || 0)]);
  rows.push(['Projekt', 'Slæbebeløb', formatNumberForCSV(data.totals?.slaebeBelob || 0)]);
  rows.push(['Projekt', 'Tralleløft i alt', formatNumberForCSV(data.totals?.traelleSum || 0)]);
  rows.push(['Projekt', 'Samlet akkordsum', formatNumberForCSV(data.totals?.akkordsum || 0)]);
  rows.push(['Projekt', 'Timer', formatNumberForCSV(data.totals?.timer || 0)]);
  rows.push(['Projekt', 'Timepris (uden tillæg)', formatNumberForCSV(data.totals?.akkordTimeLon || 0)]);
  rows.push(['Projekt', 'Lønsum', formatNumberForCSV(data.totals?.loensum || 0)]);
  rows.push(['Projekt', 'Projektsum', formatNumberForCSV(data.totals?.projektsum || 0)]);

  const csvContent = rows
    .map(row => row.map(cell => escapeCSV(cell ?? '')).join(';'))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const baseName = sanitizeFilename(sagsinfo.sagsnummer || 'sag') || 'sag';
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}-ekomplet.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setEkompletStatus('Filen er hentet og klar til upload i E-komplet.', 'success');
  updateActionHint('E-komplet fil er genereret.', 'success');
}


// --- CSV-eksport ---
function buildCSVPayload(customSagsnummer, options = {}) {
  if (!options?.skipValidation && !validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return null;
  }
  if (!options?.skipBeregn) {
    beregnLon();
  }
  const info = collectSagsinfo();
  if (customSagsnummer) {
    info.sagsnummer = customSagsnummer;
  }
  const cache = typeof window !== 'undefined' ? window.__beregnLonCache : null;
  const tralleState = typeof window !== 'undefined' ? window.__traelleloeft : null;
  const materials = getAllData().filter(item => toNumber(item.quantity) > 0);
  const labor = Array.isArray(laborEntries) ? laborEntries : [];
  const tralleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;
  const materialSum = cache && Number.isFinite(cache.materialSum)
    ? cache.materialSum
    : calcMaterialesum() + tralleSum;
  const laborSum = cache && Number.isFinite(cache.laborSum)
    ? cache.laborSum
    : calcLoensum();
  const projectSum = cache && Number.isFinite(cache.projectSum)
    ? cache.projectSum
    : materialSum + laborSum;

  const lines = [];
  lines.push('Sektion;Felt;Værdi;Antal;Pris;Linjesum');
  lines.push(`Sagsinfo;Sagsnummer;${escapeCSV(info.sagsnummer)};;;`);
  lines.push(`Sagsinfo;Navn/opgave;${escapeCSV(info.navn)};;;`);
  lines.push(`Sagsinfo;Adresse;${escapeCSV(info.adresse)};;;`);
  lines.push(`Sagsinfo;Kunde;${escapeCSV(info.kunde)};;;`);
  lines.push(`Sagsinfo;Dato;${escapeCSV(info.dato)};;;`);
  lines.push(`Sagsinfo;Status;${escapeCSV(formatStatusLabel(info.status))};;;`);
  const montorText = (info.montoer || '').replace(/\r?\n/g, ', ');
  lines.push(`Sagsinfo;Montørnavne;${escapeCSV(montorText)};;;`);

  lines.push('');
  lines.push('Sektion;Id;Materiale;Antal;Pris;Linjesum');
  if (materials.length === 0) {
    lines.push('Materiale;;;0;0,00;0,00');
  } else {
    materials.forEach(item => {
      const qty = toNumber(item.quantity);
      if (qty === 0) return;
      const price = toNumber(item.price);
      const total = qty * price;
      const manualIndex = manualMaterials.indexOf(item);
      const label = item.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item.name;
      lines.push(`Materiale;${escapeCSV(item.id)};${escapeCSV(label)};${escapeCSV(formatNumberForCSV(qty))};${escapeCSV(formatNumberForCSV(price))};${escapeCSV(formatNumberForCSV(total))}`);
    });
  }

  const tralle = window.__traelleloeft;
  if (tralle && (tralle.n35 > 0 || tralle.n50 > 0)) {
    if (tralle.n35 > 0) {
      const total35 = tralle.n35 * tralle.RATE35;
      lines.push(`Materiale;TL35;Tralleløft 0,35 m;${escapeCSV(formatNumberForCSV(tralle.n35))};${escapeCSV(formatNumberForCSV(tralle.RATE35))};${escapeCSV(formatNumberForCSV(total35))}`);
    }
    if (tralle.n50 > 0) {
      const total50 = tralle.n50 * tralle.RATE50;
      lines.push(`Materiale;TL50;Tralleløft 0,50 m;${escapeCSV(formatNumberForCSV(tralle.n50))};${escapeCSV(formatNumberForCSV(tralle.RATE50))};${escapeCSV(formatNumberForCSV(total50))}`);
    }
  }

  lines.push('');
  lines.push('Sektion;Arbejdstype;Timer;Sats;Linjesum');
  if (labor.length === 0) {
    lines.push('Løn;Ingen registrering;;;');
  } else {
    labor.forEach((entry, index) => {
      const hours = toNumber(entry.hours);
      const rate = toNumber(entry.rate);
      const total = hours * rate;
      const type = entry.type || `Arbejdstype ${index + 1}`;
      lines.push(`Løn;${escapeCSV(type)};${escapeCSV(formatNumberForCSV(hours))};${escapeCSV(formatNumberForCSV(rate))};${escapeCSV(formatNumberForCSV(total))}`);
    });
  }

  lines.push('');
  lines.push('Sektion;Total;Beløb');
  lines.push(`Total;Materialesum;${escapeCSV(formatNumberForCSV(materialSum))}`);
  lines.push(`Total;Lønsum;${escapeCSV(formatNumberForCSV(laborSum))}`);
  lines.push(`Total;Projektsum;${escapeCSV(formatNumberForCSV(projectSum))}`);

  const content = lines.join('\n');
  const baseName = sanitizeFilename(info.sagsnummer || 'akkordseddel') || 'akkordseddel';
  return {
    content,
    baseName,
    fileName: `${baseName}.csv`,
    originalName: info.sagsnummer,
  };
}

function downloadCSV(customSagsnummer, options = {}) {
  const payload = buildCSVPayload(customSagsnummer, options);
  if (!payload) return false;
  const blob = new Blob([payload.content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  updateActionHint('CSV er gemt til din enhed.', 'success');
  return true;
}

function generateCSVString(options = {}) {
  const payload = buildCSVPayload(options?.customSagsnummer, options);
  return payload ? payload.content : '';
}

// --- PDF-eksport (html2canvas + jsPDF) ---
async function exportPDFBlob(customSagsnummer, options = {}) {
  if (!options?.skipValidation && !validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return null;
  }
  if (!options?.skipBeregn) {
    beregnLon();
  }
  const info = collectSagsinfo();
  if (customSagsnummer) {
    info.sagsnummer = customSagsnummer;
  }
  const cache = typeof window !== 'undefined' ? window.__beregnLonCache : null;
  const tralleState = typeof window !== 'undefined' ? window.__traelleloeft : null;
  const materials = getAllData().filter(item => toNumber(item.quantity) > 0);
  const labor = Array.isArray(laborEntries) ? laborEntries : [];
  const tralleSum = tralleState && Number.isFinite(tralleState.sum) ? tralleState.sum : 0;
  const materialSum = cache && Number.isFinite(cache.materialSum)
    ? cache.materialSum
    : calcMaterialesum() + tralleSum;
  const laborSum = cache && Number.isFinite(cache.laborSum)
    ? cache.laborSum
    : calcLoensum();
  const projectSum = cache && Number.isFinite(cache.projectSum)
    ? cache.projectSum
    : materialSum + laborSum;

  const wrapper = document.createElement('div');
  wrapper.className = 'export-preview';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#000000';
  wrapper.style.padding = '24px';
  wrapper.style.width = '794px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.innerHTML = `
    <style>
      .export-preview { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
      .export-preview h2 { margin-top: 0; }
      .export-preview section { margin-bottom: 16px; }
      .export-preview ul { list-style: none; padding: 0; margin: 0; }
      .export-preview ul li { margin-bottom: 6px; }
      .export-preview table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .export-preview th, .export-preview td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 14px; }
      .export-preview th { background: #f0f0f0; }
      .export-preview .totals { display: flex; gap: 12px; flex-wrap: wrap; }
      .export-preview .totals div { background: #f7f7f7; border: 1px solid #ddd; padding: 8px 12px; border-radius: 6px; }
    </style>
    <h2>Akkordseddel</h2>
    <section>
      <h3>Sagsinfo</h3>
      <ul>
        <li><strong>Sagsnummer:</strong> ${escapeHtml(info.sagsnummer)}</li>
        <li><strong>Navn/opgave:</strong> ${escapeHtml(info.navn)}</li>
        <li><strong>Adresse:</strong> ${escapeHtml(info.adresse)}</li>
        <li><strong>Kunde:</strong> ${escapeHtml(info.kunde)}</li>
        <li><strong>Dato:</strong> ${escapeHtml(info.dato)}</li>
        <li><strong>Status:</strong> ${escapeHtml(formatStatusLabel(info.status))}</li>
        <li><strong>Montørnavne:</strong> ${escapeHtml(info.montoer).replace(/\n/g, '<br>')}</li>
      </ul>
    </section>
    <section>
      <h3>Materialer</h3>
      ${materials.length ? `
        <table class="export-table">
          <thead>
            <tr><th>Id</th><th>Materiale</th><th>Antal</th><th>Pris</th><th>Linjesum</th></tr>
          </thead>
          <tbody>
            ${materials.map(item => {
              const qty = toNumber(item.quantity);
              const price = toNumber(item.price);
              const total = qty * price;
              const manualIndex = manualMaterials.indexOf(item);
              const label = item.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item.name;
              return `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(label)}</td><td>${qty.toLocaleString('da-DK', { maximumFractionDigits: 2 })}</td><td>${formatCurrency(price)} kr</td><td>${formatCurrency(total)} kr</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      ` : '<p>Ingen materialer registreret.</p>'}
    </section>
    <section>
      <h3>Løn</h3>
      ${labor.length ? `
        <table class="export-table">
          <thead>
            <tr><th>Arbejdstype</th><th>Timer</th><th>Sats</th><th>Linjesum</th></tr>
          </thead>
          <tbody>
            ${labor.map((entry, index) => {
              const hours = toNumber(entry.hours);
              const rate = toNumber(entry.rate);
              const total = hours * rate;
              const type = entry.type || `Arbejdstype ${index + 1}`;
              return `<tr><td>${escapeHtml(type)}</td><td>${hours.toLocaleString('da-DK', { maximumFractionDigits: 2 })}</td><td>${formatCurrency(rate)} kr</td><td>${formatCurrency(total)} kr</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      ` : '<p>Ingen lønlinjer registreret.</p>'}
    </section>
    <section>
      <h3>Totals</h3>
      <div class="totals">
        <div><strong>Materialesum</strong><div>${formatCurrency(materialSum)} kr</div></div>
        <div><strong>Lønsum</strong><div>${formatCurrency(laborSum)} kr</div></div>
        <div><strong>Projektsum</strong><div>${formatCurrency(projectSum)} kr</div></div>
      </div>
    </section>
    <section>
      <h3>Detaljer</h3>
      ${document.getElementById('lonResult')?.innerHTML || '<p>Ingen beregning udført.</p>'}
    </section>
  `;

  document.body.appendChild(wrapper);
  try {
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    const baseName = sanitizeFilename(info.sagsnummer || 'akkordseddel');
    const blob = doc.output('blob');
    return { blob, baseName, fileName: `${baseName}.pdf` };
  } catch (err) {
    console.error('PDF eksport fejlede:', err);
    updateActionHint('PDF eksport fejlede. Prøv igen.', 'error');
    return null;
  } finally {
    document.body.removeChild(wrapper);
  }
}

async function exportPDF(customSagsnummer, options = {}) {
  const payload = await exportPDFBlob(customSagsnummer, options);
  if (!payload) return;
  const url = URL.createObjectURL(payload.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  updateActionHint('PDF er gemt til din enhed.', 'success');
}

async function exportZip() {
  if (!validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return;
  }
  if (typeof JSZip === 'undefined') {
    updateActionHint('ZIP bibliotek er ikke indlæst.', 'error');
    return;
  }
  try {
    beregnLon();
    const csvPayload = buildCSVPayload(null, { skipValidation: true, skipBeregn: true });
    if (!csvPayload) return;
    const pdfPayload = await exportPDFBlob(csvPayload.originalName || csvPayload.baseName, { skipValidation: true, skipBeregn: true });
    if (!pdfPayload) return;

    const zip = new JSZip();
    zip.file(csvPayload.fileName, csvPayload.content);
    zip.file(pdfPayload.fileName, pdfPayload.blob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    const baseName = csvPayload.baseName || pdfPayload.baseName || 'akkordseddel';
    link.href = url;
    link.download = `${baseName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    updateActionHint('ZIP med PDF og CSV er gemt.', 'success');
  } catch (error) {
    console.error('ZIP eksport fejlede', error);
    updateActionHint('ZIP eksport fejlede. Prøv igen.', 'error');
  }
}

// --- Samlet eksport ---
async function exportAll(customSagsnummer) {
  if (!validateSagsinfo()) {
    updateActionHint('Udfyld Sagsinfo for at eksportere.', 'error');
    return;
  }
  const sagsnummer = customSagsnummer || beregnLon();
  if (!sagsnummer) return;
  downloadCSV(sagsnummer, { skipBeregn: true, skipValidation: true });
  await exportPDF(sagsnummer, { skipBeregn: true });
  updateActionHint('Eksport af PDF og CSV er fuldført.', 'success');
}

// --- CSV-import for optælling ---
function importJSONProject(file) {
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const text = event.target?.result;
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Ugyldigt JSON format');
      }
      const snapshot = parsed.data && !parsed.sagsinfo ? parsed.data : parsed;
      applyProjectSnapshot(snapshot, { skipHint: true });
      updateActionHint('JSON sag er indlæst.', 'success');
    } catch (error) {
      console.error('Kunne ikke importere JSON', error);
      updateActionHint('Kunne ikke importere JSON-filen.', 'error');
    }
  };
  reader.onerror = () => {
    updateActionHint('Kunne ikke læse filen.', 'error');
  };
  reader.readAsText(file, 'utf-8');
}

function uploadCSV(file) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name) && !(file.type && file.type.includes('csv'))) {
    updateActionHint('Vælg en gyldig CSV-fil for at importere.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const rows = parseCSV(event.target.result);
      applyCSVRows(rows);
      updateActionHint('CSV er importeret.', 'success');
    } catch (err) {
      console.error('Kunne ikke importere CSV', err);
      updateActionHint('Kunne ikke importere CSV-filen.', 'error');
    }
  };
  reader.readAsText(file, 'utf-8');
}


// --- Global Numeric Keyboard ---
const numericKeyboard = (() => {
  let overlay;
  let display;
  let currentInput = null;
  let buffer = '';
  let previousFocus = null;
  let initialized = false;

  function ensureOverlay() {
    if (initialized) return;
    initialized = true;
    overlay = document.createElement('div');
    overlay.className = 'keypad-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="keypad" role="dialog" aria-modal="true" aria-label="Numerisk tastatur">
        <div class="keypad-display" aria-live="polite">0</div>
        <div class="keypad-grid">
          <button type="button" data-key="7">7</button>
          <button type="button" data-key="8">8</button>
          <button type="button" data-key="9">9</button>
          <button type="button" data-key="4">4</button>
          <button type="button" data-key="5">5</button>
          <button type="button" data-key="6">6</button>
          <button type="button" data-key="1">1</button>
          <button type="button" data-key="2">2</button>
          <button type="button" data-key="3">3</button>
          <button type="button" data-key="0">0</button>
          <button type="button" data-key=".">,</button>
          <button type="button" data-action="backspace" aria-label="Slet">⌫</button>
        </div>
        <div class="keypad-quick" role="group" aria-label="Hurtig justering">
          <button type="button" data-delta="-10">-10</button>
          <button type="button" data-delta="-5">-5</button>
          <button type="button" data-delta="-1">-1</button>
          <button type="button" data-delta="1">+1</button>
          <button type="button" data-delta="5">+5</button>
          <button type="button" data-delta="10">+10</button>
        </div>
        <div class="keypad-actions">
          <button type="button" data-action="clear">C</button>
          <button type="button" data-action="ok">OK</button>
        </div>
        <button type="button" class="keypad-close">Luk</button>
      </div>
    `;
    document.body.appendChild(overlay);
    display = overlay.querySelector('.keypad-display');

    overlay.addEventListener('click', event => {
      if (event.target === overlay) hide();
    });

    const closeButton = overlay.querySelector('.keypad-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => hide());
    }
    overlay.addEventListener('keydown', handleOverlayKeydown);

    overlay.querySelectorAll('[data-key]').forEach(btn => {
      btn.addEventListener('click', () => appendValue(btn.dataset.key));
    });
    overlay.querySelector('[data-action="backspace"]').addEventListener('click', backspace);
    overlay.querySelector('[data-action="clear"]').addEventListener('click', clearBuffer);
    overlay.querySelector('[data-action="ok"]').addEventListener('click', applyValue);
    overlay.querySelectorAll('[data-delta]').forEach(btn => {
      const delta = Number(btn.dataset.delta);
      btn.addEventListener('click', () => adjustValue(delta));
    });

    document.addEventListener('focusin', handleFocusIn, { capture: true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('show')) {
        event.preventDefault();
        hide();
      }
    });
  }

  function isNumericCandidate(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    if (el.disabled || el.readOnly) return false;
    const type = (el.getAttribute('type') || '').toLowerCase();
    const inputmode = (el.getAttribute('inputmode') || '').toLowerCase();
    if (type === 'number') return true;
    if (inputmode === 'numeric' || inputmode === 'decimal') return true;
    if (el.dataset.numpad === 'true') return true;
    return false;
  }

  function handleFocusIn(event) {
    if (!initialized) return;
    const target = event.target;
    if (overlay.contains(target)) return;
    if (isNumericCandidate(target)) {
      show(target);
    } else if (currentInput && target !== currentInput) {
      hide();
    }
  }

  function isZeroLike(value) {
    if (value === null || value === undefined) return false;
    const raw = String(value).trim();
    if (!raw) return false;
    if (/[1-9]/.test(raw)) return false;
    const normalized = parseFloat(raw.replace(',', '.'));
    return Number.isFinite(normalized) && normalized === 0;
  }

  function show(input) {
    ensureOverlay();
    currentInput = input;
    const rawValue = input.value ?? '';
    if (isZeroLike(rawValue)) {
      buffer = '';
      input.value = '';
    } else {
      buffer = rawValue ? String(rawValue).replace(',', '.') : '';
    }
    previousFocus = document.activeElement;
    updateDisplay();
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      const firstButton = overlay.querySelector('[data-key="7"]') || overlay.querySelector('[data-key]');
      firstButton?.focus();
    });
  }

  function hide(options = {}) {
    const restoreFocus = options?.restoreFocus !== false;
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    const target = currentInput;
    currentInput = null;
    buffer = '';
    const lastFocus = previousFocus;
    previousFocus = null;
    if (target && typeof target.blur === 'function') {
      target.blur();
    }
    if (restoreFocus && lastFocus && lastFocus !== target && typeof lastFocus.focus === 'function') {
      requestAnimationFrame(() => {
        lastFocus.focus();
      });
    }
  }

  function updateDisplay() {
    if (!display) return;
    const value = buffer !== '' ? buffer : '0';
    display.textContent = value.replace('.', ',');
  }

  function appendValue(key) {
    if (!currentInput) return;
    if (key === '.' || key === ',') {
      if (buffer.includes('.')) return;
      buffer = buffer || currentInput.value?.replace(',', '.') || '';
      if (!buffer) buffer = '0';
      buffer += '.';
    } else {
      if (buffer === '0') {
        buffer = key;
      } else {
        buffer += key;
      }
    }
    updateDisplay();
  }

  function backspace() {
    if (!currentInput) return;
    buffer = buffer.slice(0, -1);
    updateDisplay();
  }

  function clearBuffer() {
    buffer = '';
    updateDisplay();
  }

  function normalizeNumber(value) {
    if (!Number.isFinite(value)) return '';
    const rounded = Math.round(value * 100000) / 100000;
    return String(rounded);
  }

  function adjustValue(delta) {
    if (!currentInput || !Number.isFinite(delta)) return;
    const baseBuffer = buffer !== '' ? parseFloat(buffer) : parseFloat((currentInput.value || '').replace(',', '.'));
    const base = Number.isFinite(baseBuffer) ? baseBuffer : 0;
    let next = base + delta;
    if (next < 0) next = 0;
    buffer = normalizeNumber(next);
    updateDisplay();
  }

  function applyValue() {
    if (!currentInput) {
      hide();
      return;
    }
    const finalValue = buffer || currentInput.value || '';
    let normalized = finalValue.replace(',', '.');
    if (normalized.endsWith('.')) {
      normalized = normalized.slice(0, -1);
    }
    currentInput.value = normalized;
    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
    currentInput.dispatchEvent(new Event('change', { bubbles: true }));
    hide({ restoreFocus: false });
  }

  function handleOverlayKeydown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const elements = Array.from(overlay.querySelectorAll('button')).filter(btn => !btn.disabled);
      if (elements.length === 0) return;
      const index = elements.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (index <= 0 ? elements.length - 1 : index - 1)
        : (index === elements.length - 1 ? 0 : index + 1);
      elements[nextIndex].focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      applyValue();
    }
  }

  return {
    init: ensureOverlay,
    show,
    hide,
  };
})();

function setupMobileKeyboardDismissal() {
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const type = target.type?.toLowerCase?.() || '';
    const mode = target.inputMode?.toLowerCase?.() || '';
    if (type === 'number' || mode === 'numeric' || mode === 'decimal') {
      event.preventDefault();
      target.blur();
    }
  });

  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const type = target.type?.toLowerCase?.() || '';
    const mode = target.inputMode?.toLowerCase?.() || '';
    if (type === 'number' || mode === 'numeric' || mode === 'decimal') {
      if (typeof target.blur === 'function') {
        target.blur();
      }
    }
  });
}


// --- Initialization ---
let appInitialized = false;

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  vis('sagsinfo');

  const navConfig = [
    { id: 'btnSagsinfo', section: 'sagsinfo' },
    { id: 'btnOptaelling', section: 'optaelling' },
    { id: 'btnLon', section: 'lon' },
  ];

  navConfig.forEach(({ id, section, onActivate }) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('click', () => {
      vis(section);
      if (typeof onActivate === 'function') {
        onActivate();
      }
    });
  });

  const optaellingContainer = document.getElementById('optaellingContainer');
  if (optaellingContainer) {
    optaellingContainer.addEventListener('input', handleOptaellingInput);
    optaellingContainer.addEventListener('change', handleOptaellingInput);
  }

  const showSelectedInput = document.getElementById('showSelectedOnly');
  if (showSelectedInput) {
    showSelectedInput.addEventListener('change', () => {
      updateMaterialVisibility();
    });
  }

  hydrateMaterialListsFromJson();
  setupListSelectors();
  renderOptaelling();
  if (typeof updateSelectedSummary === 'function') {
    updateSelectedSummary();
  }
  addWorker();

  setupCSVImport();

  initStatusControls();
  populateRecentCases();

  setupGuideModal();

  document.getElementById('btnBeregnLon')?.addEventListener('click', () => beregnLon());
  document.getElementById('btnPrint')?.addEventListener('click', () => {
    if (validateSagsinfo()) {
      window.print();
    } else {
      updateActionHint('Udfyld Sagsinfo for at kunne printe.', 'error');
    }
  });

  document.getElementById('btnExportCSV')?.addEventListener('click', () => downloadCSV());

  document.getElementById('btnExportAll')?.addEventListener('click', async () => {
    await exportAll();
  });

  document.getElementById('btnExportZip')?.addEventListener('click', async () => {
    await exportZip();
  });

  document.getElementById('btnAddWorker')?.addEventListener('click', () => addWorker());

  const recentSelect = document.getElementById('recentCases');
  if (recentSelect) {
    recentSelect.addEventListener('change', event => {
      const loadBtn = document.getElementById('btnLoadCase');
      if (loadBtn) {
        loadBtn.disabled = !(event.target.value);
      }
    });
  }
  document.getElementById('btnLoadCase')?.addEventListener('click', () => handleLoadCase());

  ['traelleloeft35', 'traelleloeft50'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => updateTotals());
      input.addEventListener('change', () => updateTotals(true));
    }
  });

  sagsinfoFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => validateSagsinfo());
      el.addEventListener('change', () => validateSagsinfo());
    }
  });

  validateSagsinfo();
  updateTotals(true);
  numericKeyboard.init();
  setupMobileKeyboardDismissal();

  const calendarIcon = document.getElementById('calendarIcon');
  if (calendarIcon) {
    calendarIcon.addEventListener('click', () => {
      const dateField = document.getElementById('sagsdato');
      if (!dateField) return;
      if (typeof dateField.showPicker === 'function') {
        dateField.showPicker();
      } else {
        dateField.focus();
        if (typeof dateField.click === 'function') {
          dateField.click();
        }
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
