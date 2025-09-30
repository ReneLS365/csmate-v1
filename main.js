/*
 * Hovedscript for Scafix v8.
 * Dette script håndterer alt fra rendering af materialelisten til
 * udregning af akkordgrundlag, offline storage og eksport til CSV/PDF.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Sæt dato til i dag som default
  const projDato = document.getElementById('projDato');
  if (projDato) {
    projDato.value = new Date().toISOString().substring(0, 10);
  }

  // Sammensæt alle materialer i én liste og tilføj en qty-egenskab
  const allMaterials = [];
  if (typeof BOSTA_DATA !== 'undefined') allMaterials.push(...BOSTA_DATA);
  if (typeof HAKI_DATA !== 'undefined') allMaterials.push(...HAKI_DATA);
  if (typeof MODEX_DATA !== 'undefined') allMaterials.push(...MODEX_DATA);
  allMaterials.forEach(item => {
    item.qty = 0;
  });

  const materialsList = document.getElementById('materialsList');
  const searchInput = document.getElementById('searchMaterialer');

  function renderMaterials(filter = '') {
    materialsList.innerHTML = '';
    const f = filter.toLowerCase();
    const filtered = allMaterials.filter(item =>
      item.navn.toLowerCase().includes(f) ||
      (item.varenr && item.varenr.toLowerCase().includes(f))
    );
    // Sortér alfabetisk
    filtered.sort((a, b) => a.navn.localeCompare(b.navn));
    filtered.forEach(item => {
      const row = document.createElement('div');
      row.className = 'material-row';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'mat-name';
      nameSpan.textContent = item.navn;
      const priceSpan = document.createElement('span');
      priceSpan.className = 'mat-price';
      priceSpan.textContent = item.pris.toFixed(2) + ' kr';
      const qtyControl = document.createElement('div');
      qtyControl.className = 'qty-control';
      const minusBtn = document.createElement('button');
      minusBtn.textContent = '−';
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '0';
      qtyInput.value = item.qty;
      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      // Minus handler
      minusBtn.addEventListener('click', () => {
        if (item.qty > 0) {
          item.qty--;
          qtyInput.value = item.qty;
        }
      });
      // Plus handler
      plusBtn.addEventListener('click', () => {
        item.qty++;
        qtyInput.value = item.qty;
      });
      // Manuel indtastning
      qtyInput.addEventListener('change', () => {
        const v = parseFloat(qtyInput.value);
        item.qty = isNaN(v) || v < 0 ? 0 : v;
        qtyInput.value = item.qty;
      });
      qtyControl.appendChild(minusBtn);
      qtyControl.appendChild(qtyInput);
      qtyControl.appendChild(plusBtn);
      row.appendChild(nameSpan);
      row.appendChild(priceSpan);
      row.appendChild(qtyControl);
      materialsList.appendChild(row);
    });
  }

  searchInput.addEventListener('input', (e) => {
    renderMaterials(e.target.value);
  });

  // Initial rendering
  renderMaterials();

  // Beregningsfunktion
  function calculateTotals() {
    let materialSum = 0;
    const regLines = [];
    allMaterials.forEach(item => {
      const qty = item.qty || 0;
      if (qty > 0) {
        const sum = qty * item.pris;
        materialSum += sum;
        regLines.push({ varenr: item.varenr, navn: item.navn, antal: qty, pris: item.pris });
      }
    });
    const delopgaveSel = document.getElementById('delopgave');
    const jobType = delopgaveSel ? delopgaveSel.value : 'montage';
    let montageSum = 0;
    let demoSum = 0;
    if (jobType === 'montage' || jobType === 'service') {
      montageSum = materialSum;
    }
    if (jobType === 'demontage') {
      demoSum = materialSum * 0.5;
    }
    // Indlæs tillæg
    const slaebePct = parseFloat(document.getElementById('slaebePct').value) || 0;
    const trapperChecked = document.getElementById('trapper').checked;
    const boringAntal = parseFloat(document.getElementById('boringAntal').value) || 0;
    const lukHulAntal = parseFloat(document.getElementById('lukHulAntal').value) || 0;
    const tralle35Antal = parseFloat(document.getElementById('tralle35Antal').value) || 0;
    const tralle50Antal = parseFloat(document.getElementById('tralle50Antal').value) || 0;
    const kmVal = parseFloat(document.getElementById('km').value) || 0;
    const timerNormal = parseFloat(document.getElementById('timerNormal').value) || 0;
    const timerOT50 = parseFloat(document.getElementById('timerOT50').value) || 0;
    const timerOT100 = parseFloat(document.getElementById('timerOT100').value) || 0;
    // Satskonstanter (kan justeres senere)
    const tralle35Rate = 85;
    const tralle50Rate = 120;
    const boringRate = 85;
    const lukHulRate = 120;
    const kmRate = 3;
    const trapperRate = 200;
    let tillegSum = 0;
    // Slæb
    if (slaebePct > 0) {
      tillegSum += (montageSum + demoSum) * slaebePct / 100;
    }
    // Trapper
    if (trapperChecked) {
      tillegSum += trapperRate;
    }
    // Boringer
    if (boringAntal > 0) {
      tillegSum += boringAntal * boringRate;
    }
    // Luk af hul
    if (lukHulAntal > 0) {
      tillegSum += lukHulAntal * lukHulRate;
    }
    // Tralleløft
    tillegSum += tralle35Antal * tralle35Rate + tralle50Antal * tralle50Rate;
    // Km-beløb
    const kmBelob = kmVal * kmRate;
    // Løn grundlag
    const timeRate = 300; // 300 kr/timen (juster efter behov)
    const totalTimer = timerNormal + timerOT50 + timerOT100;
    const lonGrundlag = totalTimer * timeRate;
    const akkordSum = montageSum + demoSum + tillegSum + kmBelob;
    const akkordOverskud = akkordSum - lonGrundlag;
    return {
      materialSum,
      montageSum,
      demoSum,
      tillegSum,
      kmBelob,
      akkordSum,
      akkordOverskud,
      regLines
    };
  }

  // Vis resultat i UI
  function displayTotals(totals) {
    const res = document.getElementById('resultater');
    const fmt = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 2 });
    res.innerHTML = '';
    const list = [
      { label: 'Materialer', value: totals.materialSum },
      { label: 'Montage', value: totals.montageSum },
      { label: 'Demontage', value: totals.demoSum },
      { label: 'Tillæg', value: totals.tillegSum },
      { label: 'Km', value: totals.kmBelob },
      { label: 'Akkordgrundlag', value: totals.akkordSum },
      { label: 'Akkordoverskud', value: totals.akkordOverskud }
    ];
    list.forEach(item => {
      const p = document.createElement('p');
      p.innerHTML = `${item.label}: <strong>${fmt.format(item.value)}</strong>`;
      res.appendChild(p);
    });
  }

  // Beregn-knap
  document.getElementById('btnBeregn').addEventListener('click', () => {
    const totals = calculateTotals();
    displayTotals(totals);
  });

  // Funktion til at samle registreringens data til gem/export
  function gatherRegistration(totals) {
    return {
      sagsnummer: document.getElementById('projId').value.trim(),
      projektid: document.getElementById('projId').value.trim(),
      adresse: document.getElementById('projAdresse').value.trim(),
      projektNavn: document.getElementById('projNavn').value.trim(),
      delopgave: document.getElementById('delopgave').value,
      dato: document.getElementById('projDato').value || new Date().toISOString().substring(0, 10),
      montor: document.getElementById('montorNavn').value.trim(),
      sjak: document.getElementById('sjak').value.trim(),
      timerNormal: parseFloat(document.getElementById('timerNormal').value) || 0,
      timerOT50: parseFloat(document.getElementById('timerOT50').value) || 0,
      timerOT100: parseFloat(document.getElementById('timerOT100').value) || 0,
      km: parseFloat(document.getElementById('km').value) || 0,
      slaebePct: parseFloat(document.getElementById('slaebePct').value) || 0,
      trapper: document.getElementById('trapper').checked ? 'Ja' : 'Nej',
      boringAntal: parseFloat(document.getElementById('boringAntal').value) || 0,
      lukHulAntal: parseFloat(document.getElementById('lukHulAntal').value) || 0,
      tralle35Antal: parseFloat(document.getElementById('tralle35Antal').value) || 0,
      tralle50Antal: parseFloat(document.getElementById('tralle50Antal').value) || 0,
      notat: document.getElementById('notat').value.trim(),
      totals
    };
  }

  // Gem offline
  document.getElementById('btnGem').addEventListener('click', () => {
    const totals = calculateTotals();
    const reg = gatherRegistration(totals);
    const existing = JSON.parse(localStorage.getItem('registrations') || '[]');
    existing.push(reg);
    localStorage.setItem('registrations', JSON.stringify(existing));
    alert('Registrering gemt i offline listen. Du kan senere eksportere den.');
  });

  // Eksport-knap
  document.getElementById('btnExport').addEventListener('click', async () => {
    const totals = calculateTotals();
    const reg = gatherRegistration(totals);
    // Byg CSV-indhold
    const { registreringCsv, reglinjeCsv } = buildCsv(reg, totals);
    downloadFile('registreringer.csv', registreringCsv, 'text/csv');
    downloadFile('reglinjer.csv', reglinjeCsv, 'text/csv');
    // Generer PDF
    await generatePdf(reg, totals);
  });

  // Byg CSV-strenge
  function buildCsv(reg, totals) {
    const header = 'Sagsnummer,projektid,adresse,delopgave,dato,montor,sjak,timer_normal,timer_ot50,timer_ot100,km,slaebe_pct,trapper,boring,luk_hul,materialer,montage,demontage,tillaeg,km_beloeb,akkord_overskud,notat';
    const cols = [
      reg.sagsnummer,
      reg.projektid,
      reg.adresse,
      reg.delopgave,
      reg.dato,
      reg.montor,
      reg.sjak,
      reg.timerNormal,
      reg.timerOT50,
      reg.timerOT100,
      reg.km,
      reg.slaebePct,
      reg.trapper,
      reg.boringAntal,
      reg.lukHulAntal,
      totals.materialSum.toFixed(2),
      totals.montageSum.toFixed(2),
      totals.demoSum.toFixed(2),
      totals.tillegSum.toFixed(2),
      totals.kmBelob.toFixed(2),
      totals.akkordOverskud.toFixed(2),
      reg.notat
    ];
    const row = cols.map(c => {
      const val = c === null || c === undefined ? '' : c;
      return (typeof val === 'string' && (val.includes(',') || val.includes('"')))
        ? '"' + val.replace(/"/g, '""') + '"'
        : val;
    }).join(',');
    const registreringCsv = header + '\n' + row + '\n';
    // Reglinjer
    const reglinjeHeader = 'registrering_id,varenr,navn,antal,enhedspris';
    const lines = totals.regLines.map(l => [reg.sagsnummer, l.varenr, l.navn, l.antal, l.pris.toFixed(2)].join(','));
    const reglinjeCsv = reglinjeHeader + '\n' + lines.join('\n') + '\n';
    return { registreringCsv, reglinjeCsv };
  }

  // Download-helper
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // PDF generering
  async function generatePdf(reg, totals) {
    const preview = document.getElementById('pdfPreview');
    preview.innerHTML = '';
    // Konstruer HTML til PDF
    const container = document.createElement('div');
    container.style.fontSize = '12px';
    container.style.color = '#000';
    container.style.width = '100%';
    container.innerHTML = `
      <h2 style="margin-bottom:4px;">Akkordseddel</h2>
      <p><strong>Projekt:</strong> ${reg.sagsnummer} – ${reg.projektNavn}<br>
      <strong>Adresse:</strong> ${reg.adresse}<br>
      <strong>Dato:</strong> ${reg.dato}<br>
      <strong>Montør:</strong> ${reg.montor}</p>
      <h3 style="margin:4px 0;">Materialer</h3>
      <table style="width:100%; border-collapse: collapse; font-size:11px;">
        <thead>
          <tr>
            <th style="border:1px solid #ccc; padding:4px; text-align:left;">Varenr</th>
            <th style="border:1px solid #ccc; padding:4px; text-align:left;">Navn</th>
            <th style="border:1px solid #ccc; padding:4px; text-align:right;">Antal</th>
            <th style="border:1px solid #ccc; padding:4px; text-align:right;">Pris</th>
            <th style="border:1px solid #ccc; padding:4px; text-align:right;">Sum</th>
          </tr>
        </thead>
        <tbody>
          ${totals.regLines.map(l => {
            const sum = (l.antal * l.pris).toFixed(2);
            return `<tr>
              <td style="border:1px solid #ccc; padding:4px;">${l.varenr}</td>
              <td style="border:1px solid #ccc; padding:4px;">${l.navn}</td>
              <td style="border:1px solid #ccc; padding:4px; text-align:right;">${l.antal}</td>
              <td style="border:1px solid #ccc; padding:4px; text-align:right;">${l.pris.toFixed(2)}</td>
              <td style="border:1px solid #ccc; padding:4px; text-align:right;">${sum}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <h3 style="margin:4px 0;">Resultat</h3>
      <p>Materialer: ${totals.materialSum.toFixed(2)} kr<br>
      Montage: ${totals.montageSum.toFixed(2)} kr<br>
      Demontage: ${totals.demoSum.toFixed(2)} kr<br>
      Tillæg: ${totals.tillegSum.toFixed(2)} kr<br>
      Km: ${totals.kmBelob.toFixed(2)} kr<br>
      Akkordgrundlag: ${totals.akkordSum.toFixed(2)} kr<br>
      Akkordoverskud: ${totals.akkordOverskud.toFixed(2)} kr</p>
    `;
    preview.appendChild(container);
    // Konverter til canvas
    const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('akkordseddel.pdf');
  }
});