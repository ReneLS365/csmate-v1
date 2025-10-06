// --- Utility Functions ---
function resolveSectionId(id) {
  if (!id) return '';
  return id.endsWith('Section') ? id : `${id}Section`;
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

  forEachNode(document.querySelectorAll('.sektion'), section => {
    const isActive = section.id === targetId;
    section.toggleAttribute('hidden', !isActive);
    if (isActive) {
      section.style.removeProperty('display');
    } else {
      section.style.display = 'none';
    }
  });

  forEachNode(document.querySelectorAll('header nav button[data-section]'), btn => {
    const buttonTarget = resolveSectionId(btn.dataset.section);
    btn.classList.toggle('active', buttonTarget === targetId);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function toNumber(value) {
  const num = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
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

// --- Global Variables ---
let admin = false;
let workerCount = 0;
let laborEntries = [];
let lastLoensum = 0;
let lastMaterialSum = 0;

// Flag to control inclusion of each material system
let includeAlfix = true;

// --- Scaffold Part Lists ---
const dataBosta = [
  { id: 1, name: "Spindelfod kort", price: 2.68, quantity: 0 },
  { id: 2, name: "Spindelfod lang", price: 2.68, quantity: 0 },
  { id: 3, name: "Vippefod", price: 4.43, quantity: 0 },
  { id: 4, name: "Kirkefod", price: 6.63, quantity: 0 },
  { id: 5, name: "Strø/trykudligner", price: 1.72, quantity: 0 },
  { id: 6, name: "Ramme 200/70", price: 16.71, quantity: 0 },
  { id: 7, name: "Ramme 150/70", price: 16.71, quantity: 0 },
  { id: 8, name: "Ramme 100/70", price: 16.71, quantity: 0 },
  { id: 9, name: "Ramme 80/70", price: 16.71, quantity: 0 },
  { id: 10, name: "Ramme 66/70", price: 16.71, quantity: 0 },
  { id: 11, name: "Gulvplade 300/70", price: 16.71, quantity: 0 },
  { id: 12, name: "Gulvplade 250/70", price: 12.53, quantity: 0 },
  { id: 13, name: "Gulvplade 200/70", price: 12.53, quantity: 0 },
  { id: 14, name: "Gulvplade 150/70", price: 8.35, quantity: 0 },
  { id: 15, name: "Gulvplade 125/70", price: 8.35, quantity: 0 },
  { id: 16, name: "Gulvplade 70/70", price: 8.35, quantity: 0 },
  { id: 17, name: "Gulvplade 300/35", price: 8.35, quantity: 0 },
  { id: 18, name: "Gulvplade 250/35", price: 6.26, quantity: 0 },
  { id: 19, name: "Gulvplade 200/35", price: 6.26, quantity: 0 },
  { id: 20, name: "Gulvplade 150/35", price: 4.18, quantity: 0 },
  { id: 21, name: "Gulvplade 125/35", price: 4.18, quantity: 0 },
  { id: 22, name: "Stigedæk 300/70", price: 20.88, quantity: 0 },
  { id: 23, name: "Stigedæk 250/70", price: 16.71, quantity: 0 },
  { id: 24, name: "Stigedæk 200/70", price: 12.53, quantity: 0 },
  { id: 25, name: "Ståldæk 300/35", price: 15.66, quantity: 0 },
  { id: 26, name: "Ståldæk 250/35", price: 10.44, quantity: 0 },
  { id: 27, name: "Ståldæk 200/35", price: 8.35, quantity: 0 },
  { id: 28, name: "Stige 200", price: 4.51, quantity: 0 },
  { id: 29, name: "Stige 300", price: 4.51, quantity: 0 },
  { id: 30, name: "Stigestøtte", price: 2.86, quantity: 0 },
  { id: 31, name: "Diagonal 3m", price: 9.12, quantity: 0 },
  { id: 32, name: "Diagonal 2,5m", price: 9.12, quantity: 0 },
  { id: 33, name: "Diagonal 100", price: 9.12, quantity: 0 },
  { id: 34, name: "Gelænder 3m", price: 5.07, quantity: 0 },
  { id: 35, name: "Gelænder 2,5m", price: 3.81, quantity: 0 },
  { id: 36, name: "Gelænder 2m", price: 3.81, quantity: 0 },
  { id: 37, name: "Gelænder 1,5m", price: 3.04, quantity: 0 },
  { id: 38, name: "Gelænder 1,2m", price: 3.04, quantity: 0 },
  { id: 39, name: "Gelænder 0,7m", price: 3.04, quantity: 0 },
  { id: 40, name: "Dob. tværgelænder", price: 6.08, quantity: 0 },
  { id: 41, name: "Ende Gelænder", price: 16.71, quantity: 0 },
  { id: 42, name: "L. Rør", price: 16.71, quantity: 0 },
  { id: 43, name: "B Rør", price: 8.37, quantity: 0 },
  { id: 44, name: "Konsol 140", price: 27.56, quantity: 0 },
  { id: 45, name: "Konsol 100", price: 19.28, quantity: 0 },
  { id: 46, name: "Konsol 70", price: 15.15, quantity: 0 },
  { id: 47, name: "Konsol 35", price: 11.03, quantity: 0 },
  { id: 48, name: "Fodspark 3m", price: 9.12, quantity: 0 },
  { id: 49, name: "Fodspark 2,5m", price: 8.11, quantity: 0 },
  { id: 50, name: "Fodspark 2m", price: 8.11, quantity: 0 },
  { id: 51, name: "Fodspark 1,5m", price: 6.08, quantity: 0 },
  { id: 52, name: "Fodspark 1,25m", price: 6.08, quantity: 0 },
  { id: 53, name: "Kanthæk 3m", price: 27.18, quantity: 0 },
  { id: 54, name: "Kanthæk 2,5m", price: 27.18, quantity: 0 },
  { id: 55, name: "Kanthæk 2m", price: 27.18, quantity: 0 },
  { id: 56, name: "Kanthæk 0,7m", price: 27.18, quantity: 0 },
  { id: 57, name: "Tværprofil aludr.", price: 15.15, quantity: 0 },
  { id: 58, name: "Alu. Drager pr. m.", price: 17.12, quantity: 0 },
  { id: 59, name: "Gelændertvinge", price: 3.99, quantity: 0 },
  { id: 60, name: "Tværprofin ram.", price: 15.15, quantity: 0 },
  { id: 61, name: "Dæklås", price: 3.99, quantity: 0 },
  { id: 62, name: "Samlerør til aludr.", price: 14.26, quantity: 0 },
  { id: 63, name: "Flapper/Singel", price: 3.99, quantity: 0 },
  { id: 64, name: "Fastkobling", price: 3.99, quantity: 0 },
  { id: 65, name: "Drejekobling", price: 3.99, quantity: 0 },
  { id: 66, name: "Kipfingrekobling", price: 3.99, quantity: 0 },
  { id: 67, name: "SK Kobling", price: 3.99, quantity: 0 },
  { id: 68, name: "Rørsamler", price: 3.99, quantity: 0 },
  { id: 69, name: "Stilladsrør 1M", price: 5.51, quantity: 0 },
  { id: 70, name: "Stilladsrør 2M", price: 11.02, quantity: 0 },
  { id: 71, name: "Stilladsrør 3M", price: 16.53, quantity: 0 },
  { id: 72, name: "Stilladsrør 4M", price: 22.04, quantity: 0 },
  { id: 73, name: "Stilladsrør 5M", price: 27.55, quantity: 0 },
  { id: 74, name: "Stilladsrør 6M", price: 33.06, quantity: 0 },
  { id: 75, name: "Stilladsrør 6M alu", price: 23.98, quantity: 0 },
  { id: 76, name: "Bøjleanker", price: 14.19, quantity: 0 },
  { id: 77, name: "Rør anker alu", price: 14.62, quantity: 0 },
  { id: 78, name: "Rør anker stål", price: 18.79, quantity: 0 },
  { id: 79, name: "Reklameskilt", price: 9.73, quantity: 0 },
  { id: 80, name: "Grøn skilt", price: 5.15, quantity: 0 },
  { id: 81, name: "Startprofil til trappe", price: 4.13, quantity: 0 },
  { id: 82, name: "Alu trappeløb", price: 51.33, quantity: 0 },
  { id: 83, name: "Gelænder trpl", price: 13.39, quantity: 0 },
  { id: 84, name: "Dobb bundramme", price: 44.85, quantity: 0 },
  { id: 85, name: "Tragt", price: 38.99, quantity: 0 },
  { id: 86, name: "Skaktrør", price: 38.99, quantity: 0 },
  { id: 87, name: "Alu.bro pr. m.", price: 15.12, quantity: 0 },
  { id: 88, name: "Net pr kvm", price: 2.85, quantity: 0 },
  { id: 89, name: "Plast pr. kvm", price: 6.64, quantity: 0 },
  { id: 90, name: "Plader pr. kvm", price: 7.97, quantity: 0 },
  { id: 91, name: "Planker M", price: 11.90, quantity: 0 },
  { id: 92, name: "Geda hejs", price: 303.08, quantity: 0 },
  { id: 93, name: "El hejs", price: 153.07, quantity: 0 },
  { id: 94, name: "Kegle u.fod", price: 6.15, quantity: 0 },
  { id: 95, name: "Kegle m.fod", price: 10.33, quantity: 0 },
  { id: 96, name: "Bræt rød/hvid", price: 6.09, quantity: 0 },
  { id: 97, name: "Hjulkonsoller", price: 20.80, quantity: 0 },
  { id: 98, name: "", price: 0.00, quantity: 0 },
  { id: 99, name: "", price: 0.00, quantity: 0 },
  { id: 100, name: "", price: 0.00, quantity: 0 }
];

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
  { id: 229, name: "Kipdrager 4,5 m", price: 249.66, quantity: 0 },
  { id: 230, name: "4,5 m kederdrager", price: 175.68, quantity: 0 },
  { id: 231, name: "3 m kededrager", price: 117.12, quantity: 0 },
  { id: 232, name: "2,25 m kederdrager", price: 87.84, quantity: 0 },
  { id: 233, name: "1,5 m kederdrager", price: 58.56, quantity: 0 },
  { id: 234, name: "Horisontal/gelænder", price: 5.22, quantity: 0 },
  { id: 235, name: "Diagonal", price: 9.40, quantity: 0 },
  { id: 236, name: "Keder-teltdug pr. m2", price: 6.42, quantity: 0 },
];

// Active lists flags
let includeBosta = true;
let includeHaki  = true;
let includeModex = true;

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
    const next = entries.map((entry, index) => {
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
      render();
      updateTotals();
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
  let combined = [];
  if (includeBosta) combined = combined.concat(dataBosta);
  if (includeHaki)  combined = combined.concat(dataHaki);
  if (includeModex) combined = combined.concat(dataModex);
  if (includeAlfix) combined = combined.concat(dataAlfix);
  if (includeManual) combined = combined.concat(manualMaterials);
  return combined;
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
  container.innerHTML = `
    <label><input type="checkbox" id="chkBosta" ${includeBosta ? 'checked' : ''}> Bosta</label>
    <label><input type="checkbox" id="chkHaki" ${includeHaki ? 'checked' : ''}> Haki</label>
    <label><input type="checkbox" id="chkModex" ${includeModex ? 'checked' : ''}> Modex</label>
    <label><input type="checkbox" id="chkAlfix" ${includeAlfix ? 'checked' : ''}> Alfix</label>
  `;
  document.getElementById('chkBosta').addEventListener('change', e => { includeBosta = e.target.checked; render(); });
  document.getElementById('chkHaki').addEventListener('change', e => { includeHaki = e.target.checked; render(); });
  document.getElementById('chkModex').addEventListener('change', e => { includeModex = e.target.checked; render(); });
  document.getElementById('chkAlfix').addEventListener('change', e => { includeAlfix = e.target.checked; render(); });
}

// --- Rendering Functions ---
function render() {
  const container = document.getElementById('optaellingContainer');
  if (!container) return;
  container.innerHTML = '';

  const items = getAllData();

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = `material-row${item.manual ? ' manual' : ''}`;
    if (item.manual) {
      row.innerHTML = `
        <label>
          <span class="cell-label">Materiale</span>
          <input type="text" class="manual-name" data-id="${item.id}" placeholder="Materiale" value="${item.name || ''}">
        </label>
        <label>
          <span class="cell-label">Pris</span>
          <input type="number" class="price" data-id="${item.id}" step="0.01" inputmode="decimal" placeholder="Pris" value="${item.price ? item.price : ''}">
        </label>
        <label>
          <span class="cell-label">Antal</span>
          <input type="number" class="qty" data-id="${item.id}" step="1" inputmode="numeric" placeholder="Antal" value="${item.quantity ? item.quantity : ''}">
        </label>
        <strong class="item-total">${formatCurrency((item.price || 0) * (item.quantity || 0))} kr</strong>
      `;
    } else {
      row.innerHTML = `
        <div class="item-name">${item.name}</div>
        <label>
          <span class="cell-label">Antal</span>
          <input type="number" class="qty" data-id="${item.id}" min="0" step="1" inputmode="numeric" value="${item.quantity || 0}">
        </label>
        <label>
          <span class="cell-label">Pris</span>
          <input type="number" class="price" data-id="${item.id}" step="0.01" inputmode="decimal" value="${item.price.toFixed(2)}" ${!admin ? 'disabled' : ''}>
        </label>
        <strong class="item-total">${formatCurrency(item.quantity * item.price)} kr</strong>
      `;
    }
    container.appendChild(row);
  });

  container.querySelectorAll('.qty').forEach(input => {
    input.addEventListener('input', handleQuantityChange);
    input.addEventListener('change', handleQuantityChange);
  });

  container.querySelectorAll('.price').forEach(input => {
    input.addEventListener('input', handlePriceChange);
    input.addEventListener('change', handlePriceChange);
  });

  container.querySelectorAll('.manual-name').forEach(input => {
    input.addEventListener('input', handleManualNameChange);
  });

  updateTotals();
}

// --- Update Functions ---
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
      qtyInput.value = item.quantity ? item.quantity : '';
    } else {
      qtyInput.value = item.quantity || 0;
    }
  }

  const priceInput = row.querySelector('input.price');
  if (priceInput && document.activeElement !== priceInput) {
    if (item.manual) {
      priceInput.value = item.price ? item.price : '';
    } else {
      priceInput.value = item.price.toFixed(2);
    }
  }

  const totalCell = row.querySelector('.item-total');
  if (totalCell) {
    totalCell.textContent = `${formatCurrency(item.price * item.quantity)} kr`;
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
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  el.textContent = `${formatCurrency(value)} kr`;
}

function updateTotals() {
  const materialSum = calcMaterialesum();
  lastMaterialSum = materialSum;
  renderCurrency('#total-material', materialSum);

  const laborSum = calcLoensum();
  lastLoensum = laborSum;
  renderCurrency('#total-labor', laborSum);

  renderCurrency('#total-project', materialSum + laborSum);

  const montageField = document.getElementById('montagepris');
  if (montageField) {
    montageField.value = materialSum.toFixed(2);
  }
  const demontageField = document.getElementById('demontagepris');
  if (demontageField) {
    demontageField.value = (materialSum * 0.5).toFixed(2);
  }
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
  };
}

function setSagsinfoField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
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

  ['btnExportCSV', 'btnExportAll', 'btnPrint'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !isValid;
  });

  const hint = document.getElementById('actionHint');
  if (hint) {
    hint.style.display = isValid ? 'none' : '';
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
  return getAllData(false).find(item => normalizeKey(item.name) === targetKey) || null;
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
  render();

  laborEntries = labor.filter(entry => entry.hours > 0 || entry.rate > 0 || entry.type);
  populateWorkersFromLabor(laborEntries);
  updateTotals();

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
      uploadCSV(file);
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
      uploadCSV(file);
      fileInput.value = '';
    }
  });
}

// --- Authentication ---
function login() { 
  if(document.getElementById("adminCode").value === "StilAce") {
    admin = true; render();
  } else {
    alert("Forkert kode");
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
    <label>Timer: <input type="number" class="worker-hours" value="0"></label>
    <label>Uddannelse:
      <select class="worker-udd">
        <option value="udd1">Udd1 (42,98 kr)</option>
        <option value="udd2">Udd2 (49,38 kr)</option>
      </select>
    </label>
    <label>Mentortillæg (22,26 kr/t): <input type="number" class="worker-tillaeg" value="0"></label>
    <div class="worker-output"></div>
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
  const sagsnummer = document.getElementById("sagsnummer").value.trim() || "uspecified";
  const montagepris = parseFloat(document.getElementById("montagepris").value) || 0;
  const demontagepris = parseFloat(document.getElementById("demontagepris").value) || 0;
  const slaebePct = (parseFloat(document.getElementById("slaebePct").value) || 0) / 100;
  const jobType = document.getElementById("jobType").value;

  const boringHullerPris = 4.70, lukHullerPris = 3.45, boringBetonPris = 11.49, kmPris = 2.12;
  const grundloen = 147, tillægUdd1 = 42.98, tillægUdd2 = 49.38;

  const antalBoringHuller = parseFloat(document.getElementById("antalBoringHuller").value) || 0;
  const antalLukHuller = parseFloat(document.getElementById("antalLukHuller").value) || 0;
  const antalBoringBeton = parseFloat(document.getElementById("antalBoringBeton").value) || 0;
  const antalKm = parseFloat(document.getElementById("km").value) || 0;

  const ekstraarbejde = (antalBoringHuller * boringHullerPris) + (antalLukHuller * lukHullerPris) + (antalBoringBeton * boringBetonPris);
  const kilometerPris = antalKm * kmPris;
  const slaebebelob = montagepris * slaebePct; // Slæb beregnes altid ud fra montagepris

  let materialeTotal = 0;
  let materialelinjer = "";
  const allData = getAllData();
  if (Array.isArray(allData)) {
    allData.forEach(item => {
      const qty = toNumber(item.quantity);
      if (qty > 0) {
        const price = toNumber(item.price);
        const total = qty * price;
        const justeretTotal = jobType === "montage" ? total : total / 2;
        materialeTotal += justeretTotal;
        const manualIndex = manualMaterials.indexOf(item);
        const label = item.manual ? (item.name?.trim() || `Manuelt materiale ${manualIndex + 1}`) : item.name;
        materialelinjer += `<div>${label}: ${qty} × ${price.toFixed(2)} kr = ${justeretTotal.toFixed(2)} kr</div>`;
      }
    });
  }

  const samletAkkordSum = materialeTotal + ekstraarbejde + kilometerPris + slaebebelob;

  const workers = document.querySelectorAll(".worker-row");
  let samletTimer = 0;
  let arbejderLinjer = "";
  let samletUdbetalt = 0;
  const beregnedeArbejdere = [];

  workers.forEach((worker, index) => {
    const hoursEl = worker.querySelector(".worker-hours");
    const tillaegEl = worker.querySelector(".worker-tillaeg");
    const uddEl = worker.querySelector(".worker-udd");
    const outputEl = worker.querySelector(".worker-output");

    const hours = parseFloat(hoursEl?.value) || 0;
    if (hours === 0) return;

    const tillaeg = parseFloat(tillaegEl?.value) || 0;
    const udd = uddEl?.value;

    samletTimer += hours;
  });

  if (samletTimer === 0) {
    document.getElementById("lonResult").innerHTML = `<div style='color:red;'>Indtast arbejdstimer for mindst én person</div>`;
    return;
  }

  const akkordTimeLøn = samletAkkordSum / samletTimer;

  workers.forEach((worker, index) => {
    const hours = parseFloat(worker.querySelector(".worker-hours").value) || 0;
    const tillaeg = parseFloat(worker.querySelector(".worker-tillaeg").value) || 0;
    const udd = worker.querySelector(".worker-udd").value;
    const outputEl = worker.querySelector(".worker-output");

    let timelon = akkordTimeLøn;
    timelon += tillaeg;
    if (udd === "udd1") timelon += tillægUdd1;
    else if (udd === "udd2") timelon += tillægUdd2;

    const total = timelon * hours;
    samletUdbetalt += total;

    outputEl.textContent = `${timelon.toFixed(2)} kr/t | Total: ${total.toFixed(2)} kr`;
    arbejderLinjer += `<div>Mand ${index + 1}: Timer: ${hours}, Timeløn: ${timelon.toFixed(2)} kr/t, Total: ${total.toFixed(2)} kr</div>`;
    beregnedeArbejdere.push({ type: jobType, hours, rate: timelon, total });
  });

  const resultatDiv = document.getElementById("lonResult");
  const materialSum = calcMaterialesum();
  const projektsum = materialSum + samletUdbetalt;
  resultatDiv.innerHTML = `
    <h3>Materialer brugt:</h3>
    ${materialelinjer || '<div>Ingen materialer brugt</div>'}
    <br><h3>Arbejdere:</h3>
    ${arbejderLinjer}<br>
    <h3>Oversigt:</h3>
    <div><strong>Slæbebeløb:</strong> ${slaebebelob.toFixed(2)} kr</div>
    <div><strong>Materialer (akkordberegnet):</strong> ${materialeTotal.toFixed(2)} kr</div>
    <div><strong>Materialesum:</strong> ${materialSum.toFixed(2)} kr</div>
    <div><strong>Ekstraarbejde:</strong> ${ekstraarbejde.toFixed(2)} kr</div>
    <div><strong>Kilometer:</strong> ${kilometerPris.toFixed(2)} kr</div>
    <div><strong>Samlet akkordsum:</strong> ${samletAkkordSum.toFixed(2)} kr</div>
    <div><strong>Timer:</strong> ${samletTimer.toFixed(1)} t</div>
    <div><strong>Timepris (uden tillæg):</strong> ${akkordTimeLøn.toFixed(2)} kr/t</div>
    <div><strong>Lønsum:</strong> ${samletUdbetalt.toFixed(2)} kr</div>
    <div><strong>Projektsum:</strong> ${projektsum.toFixed(2)} kr</div>

  `;

  laborEntries = beregnedeArbejdere;
  updateTotals();

  if (typeof window !== 'undefined') {
    const traelle35 = parseFloat(document.getElementById('traelleloeft35')?.value) || 0;
    const traelle50 = parseFloat(document.getElementById('traelleloeft50')?.value) || 0;
    const TRAELLE_RATE35 = 10.44;
    const TRAELLE_RATE50 = 14.62;
    const traelleSum = (traelle35 * TRAELLE_RATE35) + (traelle50 * TRAELLE_RATE50);
    window.__beregnLonCache = {
      materialSum: lastMaterialSum,
      laborSum: lastLoensum,
      projectSum: lastMaterialSum + lastLoensum,
      traelleSum,
      timestamp: Date.now(),
    };
  }

  return sagsnummer;
}


// --- CSV-eksport ---
function downloadCSV() {
  if (!validateSagsinfo()) {
    alert('Udfyld Sagsinfo for at eksportere.');
    return false;
  }
  const info = collectSagsinfo();
  beregnLon();
  const cache = typeof window !== 'undefined' ? window.__beregnLonCache : null;
  const tralleState = typeof window !== 'undefined' ? window.__traelleloeft : null;
  const materials = getAllData().filter(item => {
    const qty = toNumber(item.quantity);
    return qty > 0;
  });
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
  const montorText = info.montoer.replace(/\r?\n/g, ', ');
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

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const fileName = sanitizeFilename(info.sagsnummer || 'akkordseddel');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_data.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

// --- PDF-eksport (html2canvas + jsPDF) ---
async function exportPDF() {
  if (!validateSagsinfo()) {
    alert('Udfyld Sagsinfo for at eksportere.');
    return;
  }
  const info = collectSagsinfo();
  beregnLon();
  const cache = typeof window !== 'undefined' ? window.__beregnLonCache : null;
  const tralleState = typeof window !== 'undefined' ? window.__traelleloeft : null;
  const materials = getAllData().filter(item => {
    const qty = toNumber(item.quantity);
    return qty > 0;
  });
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
    const fileName = sanitizeFilename(info.sagsnummer || 'akkordseddel');
    doc.save(`${fileName}_oversigt.pdf`);
  } catch (err) {
    console.error('PDF eksport fejlede:', err);
  } finally {
    document.body.removeChild(wrapper);
  }
}

// --- Samlet eksport ---
async function exportAll() {
  if (!downloadCSV()) return;
  beregnLon();
  await exportPDF();
}

// --- CSV-import for optælling ---
function uploadCSV(file) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name) && !(file.type && file.type.includes('csv'))) {
    alert('Vælg en gyldig CSV-fil.');
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const rows = parseCSV(event.target.result);
      applyCSVRows(rows);
    } catch (err) {
      console.error('Kunne ikke importere CSV', err);
      alert('Kunne ikke importere CSV-filen.');
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

    overlay.querySelector('.keypad-close').addEventListener('click', hide);
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

  function hide() {
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    const target = currentInput;
    currentInput = null;
    buffer = '';
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    } else if (target && typeof target.focus === 'function') {
      target.focus();
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
    hide();
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


// --- Initialization ---
let appInitialized = false;

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  vis('sagsinfoSection');

  toNodeArray(document.querySelectorAll('header nav button[data-section]')).forEach(button => {
    button.addEventListener('click', () => vis(button.dataset.section));
  });

  hydrateMaterialListsFromJson();
  setupListSelectors();
  render();
  addWorker();

  setupCSVImport();

  document.getElementById('btnBeregnLon')?.addEventListener('click', () => beregnLon());
  document.getElementById('btnPrint')?.addEventListener('click', () => {
    if (validateSagsinfo()) {
      window.print();
    } else {
      alert('Udfyld Sagsinfo for at kunne printe.');
    }
  });

  document.getElementById('btnExportCSV')?.addEventListener('click', () => downloadCSV());

  document.getElementById('btnExportAll')?.addEventListener('click', async () => {
    await exportAll();
  });

  document.getElementById('btnAddWorker')?.addEventListener('click', () => addWorker());

  sagsinfoFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => validateSagsinfo());
      el.addEventListener('change', () => validateSagsinfo());
    }
  });

  validateSagsinfo();
  updateTotals();
  numericKeyboard.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}


// --- Tralleløft patch (0,35 & 0,50) ---
(function(){
  const RATE35 = 10.44;
  const RATE50 = 14.62;

  // Ensure inputs exist (if not, inject a small fieldset under Løn)
  function ensureFields(){
    if (!document.getElementById('traelleloeft35')) {
      const lonSec = document.getElementById('lonSection') || document.querySelector('#lonSection, section[id*=lon]');
      if (lonSec) {
        const fs = document.createElement('fieldset');
        fs.innerHTML = '<legend>Tralleløft</legend><div class="grid-2"><input id="traelleloeft35" placeholder="Tralleløft 0,35 (antal)" inputmode="numeric"><input id="traelleloeft50" placeholder="Tralleløft 0,50 (antal)" inputmode="numeric"></div>';
        // insert before medarbejdere fieldset if possible
        const med = lonSec.querySelector('legend, fieldset');
        lonSec.appendChild(fs);
      }
    }
  }

  function getVals(){
    const n35 = parseFloat(document.getElementById('traelleloeft35')?.value) || 0;
    const n50 = parseFloat(document.getElementById('traelleloeft50')?.value) || 0;
    return { n35, n50, sum: n35*RATE35 + n50*RATE50 };
  }

  ensureFields();

  // Wrap beregnLon
  try {
    const _origBeregn = window.beregnLon || beregnLon;
    window.beregnLon = function(){
      const ret = _origBeregn();
      const el = document.getElementById('lonResult');
      if (!el) return ret;

      const { n35, n50, sum } = getVals();
      // store globally for exports
      window.__traelleloeft = { n35, n50, RATE35, RATE50, sum };

      // Only render section if any quantity > 0
      if ((n35 + n50) > 0) {
        const html = `
          <div class="card">
            <h4>Tralleløft</h4>
            <div>0,35 m: ${n35} × ${RATE35.toFixed(2)} kr = ${(n35*RATE35).toFixed(2)} kr</div>
            <div>0,50 m: ${n50} × ${RATE50.toFixed(2)} kr = ${(n50*RATE50).toFixed(2)} kr</div>
            <div style="margin-top:6px;font-weight:600;">Tralleløft i alt: ${sum.toFixed(2)} kr</div>
          </div>`;
        el.insertAdjacentHTML('beforeend', html);
      }
      if (typeof window !== 'undefined') {
        const cache = window.__beregnLonCache || {};
        window.__beregnLonCache = {
          ...cache,
          traelleSum: sum,
          timestamp: Date.now(),
        };
      }
      return ret;
    };
  } catch(e){ console.warn('Tralleløft: kunne ikke wrappe beregnLon', e); }

})();


;(() => {
  function parseFirstNumberIn(el, label){
    if (!el) return null;
    const txt = el.textContent || '';
    const m = txt.match(/([0-9]+(?:\.[0-9]{3})*(?:\.[0-9]{2})?)/); // naive parse
    return m ? parseFloat(m[1].replace(/\./g,'.')) : null;
  }

  function updateTotals(){
    const lr = document.getElementById('lonResult');
    if (!lr) return;
    const { sum } = window.__traelleloeft || { sum:0 };

    if (sum <= 0) return;

    const divs = Array.from(lr.querySelectorAll('div'));
    const akkEl = divs.find(d => d.textContent.trim().startsWith('Samlet akkordsum:'));
    const tprEl = divs.find(d => d.textContent.trim().startsWith('Timepris (uden tillæg):'));
    const projEl = divs.find(d => d.textContent.trim().startsWith('Samlet projektsum:'));

    // Update akkordsum
    if (akkEl){
      const num = (akkEl.textContent.match(/([0-9]+(?:\.[0-9]{2}))/) || [,'0'])[1];
      const oldVal = parseFloat(num);
      if (!isNaN(oldVal)){
        const newVal = oldVal + sum;
        akkEl.innerHTML = `<strong>Samlet akkordsum:</strong> ${newVal.toFixed(2)} kr`;
      }
    }

    // Update timepris (uden tillæg) using samletTimer from text
    // Extract 'Timer:' line
    const timerEl = divs.find(d => d.textContent.trim().startsWith('Timer:'));
    if (tprEl && timerEl){
      const numTimer = (timerEl.textContent.match(/([0-9]+(?:\.[0-9])?)/) || [,'0'])[1];
      const hours = parseFloat(numTimer);
      const akkEl2 = divs.find(d => d.textContent.trim().startsWith('Samlet akkordsum:'));
      if (!isNaN(hours) && hours>0 && akkEl2){
        const numAkk = (akkEl2.textContent.match(/([0-9]+(?:\.[0-9]{2}))/) || [,'0'])[1];
        const akk = parseFloat(numAkk);
        tprEl.innerHTML = `<strong>Timepris (uden tillæg):</strong> ${(akk / hours).toFixed(2)} kr/t`;
      }
    }

    // Update projektsum by adding tralleløft sum (approx)
    if (projEl){
      const num = (projEl.textContent.match(/([0-9]+(?:\.[0-9]{2}))/) || [,'0'])[1];
      const oldVal = parseFloat(num);
      if (!isNaN(oldVal)){
        const newVal = oldVal + sum;
        projEl.innerHTML = `<strong>Samlet projektsum:</strong> ${newVal.toFixed(2)} kr`;
      }
    }

    if (typeof window !== 'undefined') {
      const baseMaterial = typeof lastMaterialSum === 'number' ? lastMaterialSum : 0;
      const baseLabor = typeof lastLoensum === 'number' ? lastLoensum : 0;
      window.__beregnLonCache = {
        materialSum: baseMaterial + sum,
        laborSum: baseLabor,
        projectSum: baseMaterial + sum + baseLabor,
        traelleSum: sum,
        timestamp: Date.now(),
      };
    }
  }

  // Hook into beregnLon again to run adjustments after insertion
  const _b = window.beregnLon;
  window.beregnLon = function(){
    const r = _b.apply(this, arguments);
    try { updateTotals(); } catch(e){ console.warn('Tralleløft totals adjust failed', e); }
    return r;
  };
})();
