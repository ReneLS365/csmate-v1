// --- Utility Functions ---
function vis(id) {
  document.querySelectorAll(".sektion").forEach(el => el.style.display = "none");
  document.getElementById(id + 'Section').style.display = 'block';
}


// --- Global Variables ---
let admin = false;
let workerCount = 0;

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

function getAllData() {
  let combined = [];
  if (includeBosta) combined = combined.concat(dataBosta);
  if (includeHaki)  combined = combined.concat(dataHaki);
  if (includeModex) combined = combined.concat(dataModex);
  if (includeAlfix) combined = combined.concat(dataAlfix);
  return combined;
}

let __materialeBaseSum = 0;

function calcMaterialesum(baseSum) {
  let base = Number(baseSum);
  if (!isFinite(base)) {
    base = __materialeBaseSum || 0;
  } else {
    __materialeBaseSum = base;
  }

  const traelleloeftSum = window.__traelleloeft?.sum || 0;
  const totals = {
    base,
    traelleloeft: traelleloeftSum,
    total: base + traelleloeftSum,
  };

  window.__materialeTotals = totals;
  return totals;
}

// --- UI for List Selection ---
function setupListSelectors() {
  const container = document.getElementById('listSelectors');
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
  const items = getAllData();
  const el = document.getElementById("optællingContainer");
  el.innerHTML = "";
  let total = 0;

  items.forEach(item => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "1rem";
    row.style.marginBottom = "5px";
    row.innerHTML = `
      <div style="flex:1;">${item.name}</div>
      <input type="number" data-id="${item.id}" class="qty" value="${item.quantity || 0}" min="0">
      <input type="number" data-id="${item.id}" class="price" value="${item.price.toFixed(2)}" ${!admin ? "disabled" : ""}>
      <div class="item-total">${(item.quantity * item.price).toFixed(2)} kr</div>
    `;
    el.appendChild(row);
    total += item.quantity * item.price;
  });

  document.getElementById("total").textContent = `Total: ${total.toFixed(2)} kr`;
  document.getElementById("montagepris").value = total.toFixed(2);
  document.getElementById("demontagepris").value = (total * 0.5).toFixed(2);

  document.querySelectorAll('.qty').forEach(input => {
    input.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      updateQty(id, e.target.value);
    });
    input.addEventListener('focus', e => {
      if (e.target.value === "0") e.target.value = "";
    });
  });

  document.querySelectorAll('.price').forEach(input => {
    input.addEventListener('change', e => {
      const id = parseInt(e.target.dataset.id);
      updatePrice(id, e.target.value);
    });
    input.addEventListener('focus', e => {
      if (e.target.value === "0") e.target.value = "";
    });
  });
}

// --- Update Functions ---
function updateQty(id, val) {
  getAllData().find(d=>d.id===id).quantity = parseFloat(val)||0;
  render();
}
function updatePrice(id, val) {
  if(!admin) return;
  getAllData().find(d=>d.id===id).price = parseFloat(val)||0;
  render();
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
      if (item.quantity > 0) {
        const total = item.quantity * item.price;
        const justeretTotal = jobType === "montage" ? total : total / 2;
        materialeTotal += justeretTotal;
        materialelinjer += `<div>${item.name}: ${item.quantity} × ${item.price.toFixed(2)} kr = ${justeretTotal.toFixed(2)} kr</div>`;
      }
    });
  }

  const materialeTotals = calcMaterialesum(materialeTotal);
  const materialeTotalMedTraelle = materialeTotals.total;
  if (materialeTotals.traelleloeft > 0) {
    materialelinjer += `<div style="margin-top:6px;font-weight:600;">Tralleløft i alt: ${materialeTotals.traelleloeft.toFixed(2)} kr</div>`;
  }

  const samletAkkordSum = materialeTotalMedTraelle + ekstraarbejde + kilometerPris + slaebebelob;

  const workers = document.querySelectorAll(".worker-row");
  let samletTimer = 0;
  let arbejderLinjer = "";
  let samletUdbetalt = 0;

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
  });

  const resultatDiv = document.getElementById("lonResult");
  resultatDiv.innerHTML = `
    <h3>Materialer brugt:</h3>
    ${materialelinjer || '<div>Ingen materialer brugt</div>'}
    <br><h3>Arbejdere:</h3>
    ${arbejderLinjer}<br>
    <h3>Oversigt:</h3>
    <div><strong>Slæbebeløb:</strong> ${slaebebelob.toFixed(2)} kr</div>
    <div><strong>Materialer (inkl. tralleløft):</strong> ${materialeTotalMedTraelle.toFixed(2)} kr</div>
    <div><strong>Ekstraarbejde:</strong> ${ekstraarbejde.toFixed(2)} kr</div>
    <div><strong>Kilometer:</strong> ${kilometerPris.toFixed(2)} kr</div>
    <div><strong>Samlet akkordsum:</strong> ${samletAkkordSum.toFixed(2)} kr</div>
    <div><strong>Timer:</strong> ${samletTimer.toFixed(1)} t</div>
    <div><strong>Timepris (uden tillæg):</strong> ${akkordTimeLøn.toFixed(2)} kr/t</div>
    <div><strong>Projektsum:</strong> ${samletUdbetalt.toFixed(2)} kr</div>

  `;

  window.__beregnLonCache = {
    materialeTotals,
    ekstraarbejde,
    kilometerPris,
    slaebebelob,
    samletAkkordSum,
    samletTimer,
    akkordTimeLøn,
    samletUdbetalt,
    jobType,
  };

  return sagsnummer;
}


// --- CSV-eksport ---
function downloadCSV(sagsnummer) {
  if (!window.__beregnLonCache) {
    beregnLon();
  }

  const items = getAllData();
  let csv = 'id;name;quantity;price\n';
  items.forEach(item => {
    if (item.quantity > 0) {
      const safeName = `"${item.name.replace(/"/g, '""')}"`;
      csv += `${item.id};${safeName};${item.quantity};${item.price}\n`;
    }
  });

  const traelle = window.__traelleloeft || { n35: 0, n50: 0, RATE35: 0, RATE50: 0, sum: 0 };
  if (traelle.n35 > 0) csv += `TL35;"Tralleløft 0,35 m";${traelle.n35};${traelle.RATE35}\n`;
  if (traelle.n50 > 0) csv += `TL50;"Tralleløft 0,50 m";${traelle.n50};${traelle.RATE50}\n`;

  const km = parseFloat(document.getElementById("km")?.value) || 0;
  const boringHuller = parseInt(document.getElementById("antalBoringHuller")?.value) || 0;
  const lukHuller = parseInt(document.getElementById("antalLukHuller")?.value) || 0;
  const boringBeton = parseInt(document.getElementById("antalBoringBeton")?.value) || 0;

  let ekstraTekst = "";
  if (boringHuller > 0) ekstraTekst += `Boring af huller: ${boringHuller} | `;
  if (lukHuller > 0) ekstraTekst += `Luk af huller: ${lukHuller} | `;
  if (boringBeton > 0) ekstraTekst += `Boring i beton: ${boringBeton} | `;

  const cache = window.__beregnLonCache || {};
  const materialeTotals = cache.materialeTotals || calcMaterialesum(cache.materialeTotals?.base);
  const materialSum = materialeTotals?.total ?? 0;
  const projectSum = cache.samletUdbetalt ?? 0;

  csv += `summary;materialSum;${materialSum.toFixed(2)};kr\n`;
  csv += `summary;projectSum;${projectSum.toFixed(2)};kr\n`;

  const totalTekst = document.getElementById("lonResult")?.innerText.replace(/\r?\n/g, '|') || "";
  const lonText = `Kilometer: ${km} km | ${ekstraTekst}${totalTekst}`.trim();

  csv += `info;"Beregningsresultater";"${lonText}";0\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sagsnummer}_beregning_optælling.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.__csvSupportsTraelle = true;

// --- PDF-eksport (html2canvas + jsPDF) ---
async function exportPDF(sagsnummer) {
  const resultDiv = document.getElementById("lonResult");
  if (!resultDiv) return;

  try {
    if (!window.__beregnLonCache) {
      beregnLon();
    }
    const canvas = await html2canvas(resultDiv, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
    doc.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    doc.save(`${sagsnummer}_beregning_resultat.pdf`);
  } catch (err) {
    console.error("PDF eksport fejlede:", err);
  }
}

// --- Samlet eksport ---
async function exportAll(sagsnummer) {
  downloadCSV(sagsnummer);
  await exportPDF(sagsnummer);
}

// --- CSV-import for optælling ---
function uploadCSV(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n');
    lines.slice(1).forEach(line => {
      if (!line.trim()) return;
      const [id, name, qty, price] = line.split(';');
      const obj = getAllData().find(d => d.id === parseInt(id));
      if (obj) {
        obj.quantity = parseFloat(qty) || 0;
        obj.price = parseFloat(price) || obj.price;
      }
    });
    render();
  };
  reader.readAsText(file);
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("btnOptaelling")?.addEventListener("click", () => vis("optælling"));
  document.getElementById("btnLon")?.addEventListener("click", () => vis("lon"));

  setupListSelectors();
  render();
  addWorker();

  document.getElementById("btnBeregnLon")?.addEventListener("click", () => beregnLon());
  document.getElementById("btnPrint")?.addEventListener("click", () => window.print());

  document.getElementById('csvUpload')?.addEventListener('change', e => uploadCSV(e.target.files[0]));
  document.getElementById('btnExportCSV')?.addEventListener('click', () => downloadCSV(document.getElementById("sagsnummer")?.value.trim() || "uspecified"));

  document.getElementById("btnExportAll")?.addEventListener("click", async () => {
    const sagsnummer = document.getElementById("sagsnummer")?.value.trim() || "uspecified";
    beregnLon();
    await exportAll(sagsnummer);
  });

  document.getElementById("btnAddWorker")?.addEventListener("click", () => addWorker());

  const guideBtn = document.getElementById("btnGuide");
  const closeModalBtn = document.getElementById("closeGuideModal");
  const modal = document.getElementById("guideModal");

  guideBtn && (guideBtn.onclick = () => modal.style.display = "block");
  closeModalBtn && (closeModalBtn.onclick = () => modal.style.display = "none");

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
});


// ===== Popup Keypad Integration (non-intrusive) =====
(function(){
  const _origRender = render;
  let kpCurrentId=null;
  let kp={op:null, buffer:'', base:0};

  function ensureOverlay(){
    if(document.getElementById('keypadOverlay')) return;
    const html = '<div id="keypadOverlay" class="keypad-overlay" aria-hidden="true">\
  <div id="keypad" class="keypad" role="dialog" aria-modal="true" aria-label="Numerisk tastatur">\
    <div class="keypad-display" id="keypadDisplay">0</div>\
    <div class="keypad-grid">\
      <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><button data-op="*">×</button>\
      <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button data-op="/">÷</button>\
      <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button data-op="-">-</button>\
      <button data-key="0">0</button><button data-action="clear">C</button><button data-action="ok" class="ok">OK</button><button data-op="+">+</button>\
    </div>\
    <button class="keypad-close" id="keypadClose" aria-label="Luk tastatur">✕</button>\
  </div>\
</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    initKeypad();
  }

  function openKeypad(forId){
    kpCurrentId = forId;
    let it = getAllData().find(d=> String(d.id)===String(forId));
    kp = { op:null, buffer:'', base: it? (Number(it.quantity)||0) : 0 };
    document.getElementById('keypadDisplay').textContent = String(kp.base);
    document.getElementById('keypadOverlay').classList.add('show');
  }
  function closeKeypad(){
    document.getElementById('keypadOverlay').classList.remove('show');
    kpCurrentId=null; kp={op:null,buffer:'',base:0};
  }
  function applyKeypad(){
    if(!kpCurrentId) return closeKeypad();
    const it = getAllData().find(d=> String(d.id)===String(kpCurrentId));
    if(!it) return closeKeypad();
    let val = kp.base;
    const n = kp.buffer===''? null : Number(kp.buffer);
    if(n!==null){
      switch(kp.op){
        case '+': val = (Number(val)||0) + n; break;
        case '-': val = Math.max(0, (Number(val)||0) - n); break;
        case '*': val = Math.round((Number(val)||0) * n); break;
        case '/': val = n===0 ? (Number(val)||0) : Math.floor((Number(val)||0)/n); break;
        default:  val = n;
      }
    }
    if(typeof updateQty === 'function') updateQty(Number(it.id), val);
    else { it.quantity = val; }
    closeKeypad();
  }
  function initKeypad(){
    const overlay = document.getElementById('keypadOverlay');
    const display = document.getElementById('keypadDisplay');
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeKeypad(); });
    document.getElementById('keypadClose').addEventListener('click', closeKeypad);
    overlay.querySelectorAll('.keypad-grid button').forEach(btn=>{
      const key = btn.getAttribute('data-key');
      const op = btn.getAttribute('data-op');
      const act = btn.getAttribute('data-action');
      btn.addEventListener('click', ()=>{
        if(key!==null && key!==undefined){
          kp.buffer += String(key);
          display.textContent = (kp.op? (kp.op+' '):'') + kp.buffer;
        }else if(op){
          kp.op = op;
          display.textContent = kp.buffer? (op + ' ' + kp.buffer) : op;
        }else if(act==='clear'){
          kp.buffer=''; kp.op=null; display.textContent = String(kp.base);
        }else if(act==='ok'){
          applyKeypad();
        }
      });
    });
  }
  function hookQtyInputs(){
    document.querySelectorAll('.qty').forEach(inp=>{
      inp.setAttribute('inputmode','none');
      inp.setAttribute('readonly','readonly');
      inp.addEventListener('click', ()=> openKeypad(inp.dataset.id));
      inp.addEventListener('focus', ()=> openKeypad(inp.dataset.id));
    });
  }
  render = function(){
    _origRender();
    ensureOverlay();
    hookQtyInputs();
  };
})();
// ===== End Popup Keypad Integration =====



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
      const vals = getVals();
      window.__traelleloeft = { n35: vals.n35, n50: vals.n50, RATE35, RATE50, sum: vals.sum };

      const ret = _origBeregn.apply(this, arguments);
      const el = document.getElementById('lonResult');
      if (!el) return ret;

      el.querySelector('.traelleloeft-card')?.remove();

      if ((vals.n35 + vals.n50) > 0) {
        const html = `
          <div class="card traelleloeft-card">
            <h4>Tralleløft</h4>
            <div>0,35 m: ${vals.n35} × ${RATE35.toFixed(2)} kr = ${(vals.n35*RATE35).toFixed(2)} kr</div>
            <div>0,50 m: ${vals.n50} × ${RATE50.toFixed(2)} kr = ${(vals.n50*RATE50).toFixed(2)} kr</div>
            <div style="margin-top:6px;font-weight:600;">Tralleløft i alt: ${vals.sum.toFixed(2)} kr</div>
          </div>`;
        el.insertAdjacentHTML('beforeend', html);
      }
      return ret;
    };
  } catch(e){ console.warn('Tralleløft: kunne ikke wrappe beregnLon', e); }

  // Replace/override downloadCSV to include tralleløft
  try {
    if (!window.__csvSupportsTraelle) {
      window.downloadCSV = function(sagsnummer){
        const items = (typeof getAllData === 'function') ? getAllData() : [];
        let csv = 'id;name;quantity;price\n';
        items.forEach(item => {
          if (item.quantity > 0) {
            const safeName = '"' + String(item.name).replace(/"/g, '""') + '"';
            csv += `${item.id};${safeName};${item.quantity};${item.price}\n`;
          }
        });

        const t = window.__traelleloeft || { n35:0, n50:0, RATE35:RATE35, RATE50:RATE50, sum:0 };
        if (t.n35 > 0) csv += `TL35;"Tralleløft 0,35 m";${t.n35};${t.RATE35}\n`;
        if (t.n50 > 0) csv += `TL50;"Tralleløft 0,50 m";${t.n50};${t.RATE50}\n`;

        const cache = window.__beregnLonCache || {};
        const totals = cache.materialeTotals || calcMaterialesum(cache.materialeTotals?.base);
        const materialSum = totals?.total ?? 0;
        const projectSum = cache.samletUdbetalt ?? 0;
        csv += `summary;materialSum;${materialSum.toFixed(2)};kr\n`;
        csv += `summary;projectSum;${projectSum.toFixed(2)};kr\n`;

        const lonText = (document.getElementById('lonResult')?.innerText || '').replace(/\s+/g,' ').trim();
        csv += `info;"Beregningsresultater";"${lonText}";0\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sagsnummer || (document.getElementById('sagsnummer')?.value.trim() || 'uspecified')}_beregning_optælling.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
    }
  } catch(e){ console.warn('Tralleløft: kunne ikke override downloadCSV', e); }
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

    const cache = window.__beregnLonCache;
    if (!cache) return;

    const totals = cache.materialeTotals || calcMaterialesum(cache.materialeTotals?.base);
    const divs = Array.from(lr.querySelectorAll('div'));

    const materialEl = divs.find(d => d.textContent.trim().startsWith('Materialer (inkl. tralleløft):'));
    if (materialEl && totals){
      materialEl.innerHTML = `<strong>Materialer (inkl. tralleløft):</strong> ${totals.total.toFixed(2)} kr`;
    }

    const akkEl = divs.find(d => d.textContent.trim().startsWith('Samlet akkordsum:'));
    if (akkEl && typeof cache.samletAkkordSum === 'number'){
      akkEl.innerHTML = `<strong>Samlet akkordsum:</strong> ${cache.samletAkkordSum.toFixed(2)} kr`;
    }

    const timerEl = divs.find(d => d.textContent.trim().startsWith('Timer:'));
    if (timerEl && typeof cache.samletTimer === 'number'){
      timerEl.innerHTML = `<strong>Timer:</strong> ${cache.samletTimer.toFixed(1)} t`;
    }

    const tprEl = divs.find(d => d.textContent.trim().startsWith('Timepris (uden tillæg):'));
    if (tprEl && typeof cache.akkordTimeLøn === 'number'){
      tprEl.innerHTML = `<strong>Timepris (uden tillæg):</strong> ${cache.akkordTimeLøn.toFixed(2)} kr/t`;
    }

    const projEl = divs.find(d => d.textContent.trim().startsWith('Projektsum:'));
    if (projEl && typeof cache.samletUdbetalt === 'number'){
      projEl.innerHTML = `<strong>Projektsum:</strong> ${cache.samletUdbetalt.toFixed(2)} kr`;
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
