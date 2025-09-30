// Scafix v8.1 core
(function(){
  const $ = s=>document.querySelector(s);
  const $$ = s=>Array.from(document.querySelectorAll(s));

  // Tabs
  $$('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.tab-btn').forEach(b=>b.classList.remove('active'));
    $$('.tab-panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  }));

  // Workers state
  let workers=[];
  const workersEl = document.getElementById('workers');
  document.getElementById('btnAddWorker').addEventListener('click',()=>{
    addWorker();
  });
  function addWorker(){
    const w = { id: crypto.randomUUID(), navn:'', normal:0, ot50:0, ot100:0,
      slaebePct:0, trapper:false, boring:0, lukHul:0, tralle35:0, tralle50:0,
      udd1:false, udd2:false, mentor:false };
    workers.push(w); renderWorkers();
  }
  function renderWorkers(){
    workersEl.innerHTML='';
    workers.forEach((w,i)=>{
      const div = document.createElement('div');
      div.className='worker';
      div.innerHTML = `
        <div class="grid-3">
          <input data-k="navn" placeholder="Navn" value="${w.navn}">
          <input data-k="normal" type="number" step="0.25" min="0" placeholder="Normal" value="${w.normal}">
          <input data-k="ot50" type="number" step="0.25" min="0" placeholder="OT 50%" value="${w.ot50}">
        </div>
        <div class="grid-3">
          <input data-k="ot100" type="number" step="0.25" min="0" placeholder="OT 100%" value="${w.ot100}">
          <input data-k="slaebePct" type="number" step="1" min="0" placeholder="Slæbe %" value="${w.slaebePct}">
          <label class="switch"><input data-k="trapper" type="checkbox" ${w.trapper?'checked':''}/> Trapper</label>
        </div>
        <div class="grid-3">
          <input data-k="boring" type="number" step="1" min="0" placeholder="Boring (antal)" value="${w.boring}">
          <input data-k="lukHul" type="number" step="1" min="0" placeholder="Luk af hul (antal)" value="${w.lukHul}">
          <div class="grid-2">
            <input data-k="tralle35" type="number" step="1" min="0" placeholder="Tralle 0,35" value="${w.tralle35}">
            <input data-k="tralle50" type="number" step="1" min="0" placeholder="Tralle 0,50" value="${w.tralle50}">
          </div>
        </div>
        <div class="grid-3">
          <label class="switch"><input data-k="udd1" type="checkbox" ${w.udd1?'checked':''}/> Udd1</label>
          <label class="switch"><input data-k="udd2" type="checkbox" ${w.udd2?'checked':''}/> Udd2</label>
          <label class="switch"><input data-k="mentor" type="checkbox" ${w.mentor?'checked':''}/> Mentor</label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="secondary" data-act="rm">Fjern</button>
        </div>`;
      div.addEventListener('input',e=>{
        const k = e.target.getAttribute('data-k');
        if(!k) return;
        const t=e.target; let v = t.type==='checkbox'?t.checked: (t.type==='number'?Number(t.value||0):t.value);
        w[k]=v;
      });
      div.querySelector('[data-act="rm"]').addEventListener('click',()=>{
        workers = workers.filter(x=>x.id!==w.id); renderWorkers();
      });
      workersEl.appendChild(div);
    });
  }
  addWorker();

  // Materials
  const materialsList = document.getElementById('materialsList');
  const searchInput = document.getElementById('searchMaterialer');
  const systemFilter = document.getElementById('systemFilter');
  const toggleCounter = document.getElementById('toggleCounter');
  const selected = new Map(); // key varenr -> {item, qty}

  function renderMaterials(){
    const q = (searchInput.value||'').toLowerCase();
    const sys = systemFilter.value;
    materialsList.innerHTML='';
    MATERIALS.filter(m=> (sys==='ALL'||m.system===sys) && (m.varenr.toLowerCase().includes(q) || m.navn.toLowerCase().includes(q)))
      .forEach(m=>{
        const row = document.createElement('div');
        row.className='material-row';
        const sel = selected.get(m.varenr)||{item:m, qty:0};
        const checked = sel.qty>0;
        row.innerHTML = `
          <input type="checkbox" class="chk" ${checked?'checked':''}>
          <div><div><b>${m.varenr}</b> – ${m.navn}</div><small>${m.system} · ${m.pris.toFixed(2)} kr</small></div>
          <div class="qty">
            ${toggleCounter.checked?`<button class="secondary minus">−</button>`:''}
            <input class="qtyInput" type="number" min="0" step="1" value="${sel.qty}">
            ${toggleCounter.checked?`<button class="secondary plus">+</button>`:''}
          </div>
          <div class="sum">${(sel.qty*m.pris).toFixed(2)} kr</div>`;
        const chk = row.querySelector('.chk');
        const qtyInput = row.querySelector('.qtyInput');
        const plus = row.querySelector('.plus');
        const minus = row.querySelector('.minus');
        const update = ()=>{
          const qty = Number(qtyInput.value||0);
          if(qty>0){ selected.set(m.varenr,{item:m, qty}); } else { selected.delete(m.varenr); chk.checked=false; }
          row.querySelector('.sum').textContent=(qty*m.pris).toFixed(2)+" kr";
        };
        chk.addEventListener('change',()=>{ if(chk.checked){ if((selected.get(m.varenr)||{qty:0}).qty===0) { qtyInput.value=1; } } else { qtyInput.value=0; } update(); });
        qtyInput.addEventListener('input',update);
        if(plus) plus.addEventListener('click',()=>{ qtyInput.value = Number(qtyInput.value||0)+1; update(); });
        if(minus) minus.addEventListener('click',()=>{ qtyInput.value = Math.max(0, Number(qtyInput.value||0)-1); update(); });
        materialsList.appendChild(row);
      });
  }
  [searchInput, systemFilter, toggleCounter].forEach(el=> el.addEventListener('input', renderMaterials));
  renderMaterials();

  // Calculation helpers
  function sumMaterials(){
    let s=0; selected.forEach(v=> s += v.qty * v.item.pris); return s;
  }
  function buildReview(){
    const proj={
      id: $('#projId').value||'', navn: $('#projNavn').value||'', adresse: $('#projAdresse').value||'', dato: $('#projDato').value||'',
      sjak: $('#sjak').value||'', del: $('#delopgave').value||'', km: Number($('#km').value||0), kmSats: Number($('#kmSats').value||0), timeSats: Number($('#timeSats').value||0), notat: $('#notat').value||''
    };
    const matSum = sumMaterials();
    const montage = matSum;
    const demontage = proj.del==='demontage'? montage*0.5 : 0;
    // job-level tillæg (her: kun km – slæbe% m.m. ligger pr. mand)
    const kmBelob = proj.km * proj.kmSats;
    // per worker tillæg
    const base = montage + demontage;
    let tillægJob=0;
    const workersView = workers.map(w=>{
      const tNormal = Number(w.normal||0), t50=Number(w.ot50||0), t100=Number(w.ot100||0);
      const slaebe = (Number(w.slaebePct||0)/100)*base;
      const trap = w.trapper? 0.0*base : 0; // sæt fast sats hvis ønsket
      const boring = Number(w.boring||0) * 85; // demo-sats
      const luk = Number(w.lukHul||0) * 120; // demo-sats
      const tr35 = Number(w.tralle35||0) * 10.44; // demo
      const tr50 = Number(w.tralle50||0) * 14.62; // demo
      const udd = (w.udd1?25:0) + (w.udd2?40:0) + (w.mentor?20:0); // demo-tillæg kr/t aktiveres i løn, ikke akkord – behold i review
      const tilSum = slaebe + trap + boring + luk + tr35 + tr50;
      tillægJob += tilSum;
      return {w, tNormal, t50, t100, slaebe, trap, boring, luk, tr35, tr50, udd, tilSum};
    });
    const akkordGrundlag = montage + demontage + tillægJob + kmBelob;
    const totalTimer = workersView.reduce((a,r)=> a + r.tNormal + r.t50 + r.t100, 0);
    const loenGrundlag = totalTimer * proj.timeSats;
    const overskud = akkordGrundlag - loenGrundlag;

    return {proj, workersView, selected, matSum, montage, demontage, kmBelob, tillægJob, akkordGrundlag, loenGrundlag, overskud, totalTimer};
  }

  function renderReview(){
    const r = buildReview();
    const matRows = Array.from(r.selected.values()).map(v=>`<tr><td>${v.item.varenr}</td><td>${v.item.navn}</td><td style="text-align:right">${v.qty}</td><td style="text-align:right">${v.item.pris.toFixed(2)}</td><td style="text-align:right">${(v.qty*v.item.pris).toFixed(2)}</td></tr>`).join('');
    const workersRows = r.workersView.map(x=>`
      <tr><td>${x.w.navn||''}</td><td style="text-align:right">${x.tNormal.toFixed(2)}</td><td style="text-align:right">${x.t50.toFixed(2)}</td><td style="text-align:right">${x.t100.toFixed(2)}</td><td style="text-align:right">${x.slaebe.toFixed(2)}</td><td style="text-align:right">${x.boring.toFixed(2)}</td><td style="text-align:right">${x.luk.toFixed(2)}</td><td style="text-align:right">${x.tr35.toFixed(2)}</td><td style="text-align:right">${x.tr50.toFixed(2)}</td><td>${x.w.udd1?'U1':''} ${x.w.udd2?'U2':''} ${x.w.mentor?'Mentor':''}</td><td style="text-align:right">${x.tilSum.toFixed(2)}</td></tr>`).join('');
    const html = `
      <div class="review">
        <p><b>Sag:</b> ${r.proj.id} – ${r.proj.navn} — ${r.proj.adresse} — ${r.proj.dato} — <b>${r.proj.del}</b> — Sjak: ${r.proj.sjak}</p>
        <p><b>Satser:</b> km=${r.proj.kmSats} kr/km, time=${r.proj.timeSats} kr/t — <b>KM:</b> ${r.proj.km} (${r.kmBelob.toFixed(2)} kr)</p>
        <h3>Materialer</h3>
        <table class="review-table"><thead><tr><th>Varenr</th><th>Navn</th><th>Antal</th><th>Pris</th><th>Sum</th></tr></thead><tbody>${matRows||'<tr><td colspan="5">Ingen materialer valgt</td></tr>'}</tbody></table>
        <h3>Montører</h3>
        <table class="review-table"><thead><tr><th>Navn</th><th>Normal</th><th>OT50</th><th>OT100</th><th>Slæbe</th><th>Boring</th><th>Luk hul</th><th>Tralle 0,35</th><th>Tralle 0,50</th><th>Udd/Mentor</th><th>Sum tillæg</th></tr></thead><tbody>${workersRows||'<tr><td colspan="11">Ingen montører</td></tr>'}</tbody></table>
        <h3>Summer</h3>
        <ul>
          <li>Materialer: <b>${r.matSum.toFixed(2)} kr</b></li>
          <li>Montage: <b>${r.montage.toFixed(2)} kr</b></li>
          <li>Demontage: <b>${r.demontage.toFixed(2)} kr</b></li>
          <li>Tillæg (job + pr. mand): <b>${r.tillægJob.toFixed(2)} kr</b></li>
          <li>Km-beløb: <b>${r.kmBelob.toFixed(2)} kr</b></li>
          <li>Akkordgrundlag: <b>${r.akkordGrundlag.toFixed(2)} kr</b></li>
          <li>Løn-grundlag (${r.totalTimer.toFixed(2)} t × ${r.proj.timeSats}): <b>${r.loenGrundlag.toFixed(2)} kr</b></li>
          <li>Akkordoverskud: <b>${r.overskud.toFixed(2)} kr</b></li>
        </ul>
        <p><b>Notat:</b> ${r.proj.notat||'-'}</p>
      </div>`;
    document.getElementById('review').innerHTML = html;
  }

  document.getElementById('btnBeregn').addEventListener('click',()=>{
    renderReview();
  });

  // Unified CSV
  function exportUnifiedCSV(){
    const r = buildReview();
    const rows=[];
    const esc = v => (v==null?'':String(v)).replace(/;/g, ',');
    const push = arr=> rows.push(arr.join(';'));
    push(['type','sagsnummer','projekt_navn','adresse','dato','montor/sjak','delopgave','registrering_id','varenr','varenavn','antal','enhedspris','sum_materiale','worker_navn','timer_normal','timer_ot50','timer_ot100','slaebe_pct','trapper','boring','luk_hul','tralle35','tralle50','udd1','udd2','mentor','km','km_sats','time_sats','sum_materialer','sum_montage','sum_demontage','sum_tillaeg_job','sum_km','akkordgrundlag','loen_grundlag','akkordoverskud','notat']);
    push(['META',r.proj.id,r.proj.navn,r.proj.adresse,r.proj.dato,r.proj.sjak,r.proj.del,'', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', r.proj.km, r.proj.kmSats, r.proj.timeSats, '', '', '', '', '', '', '', '', r.proj.notat]);
    r.selected.forEach(v=>{
      push(['MATERIAL',r.proj.id,r.proj.navn,r.proj.adresse,r.proj.dato,r.proj.sjak,r.proj.del,'',v.item.varenr,v.item.navn,v.qty,v.item.pris,(v.qty*v.item.pris).toFixed(2),'','','','','','','','','','','','','','','','','','','','','','']);
    });
    r.workersView.forEach(x=>{
      push(['WORKER',r.proj.id,r.proj.navn,r.proj.adresse,r.proj.dato,x.w.navn,r.proj.del,'','','','','','','',x.tNormal,x.t50,x.t100,x.w.slaebePct,(x.w.trapper?'Ja':'Nej'),x.boring,x.luk,x.tr35,x.tr50,(x.w.udd1?'Ja':'Nej'),(x.w.udd2?'Ja':'Nej'),(x.w.mentor?'Ja':'Nej'),'','','','','','','','','','']);
    });
    push(['TOTAL',r.proj.id,r.proj.navn,r.proj.adresse,r.proj.dato,r.proj.sjak,r.proj.del,'','','','','','','','','','','','','','','','','',r.proj.km,r.proj.kmSats,r.proj.timeSats,r.matSum.toFixed(2),r.montage.toFixed(2),r.demontage.toFixed(2),r.tillægJob.toFixed(2),r.kmBelob.toFixed(2),r.akkordGrundlag.toFixed(2),r.loenGrundlag.toFixed(2),r.overskud.toFixed(2),r.proj.notat]);
    const blob = new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'oversigt.csv'; a.click(); URL.revokeObjectURL(a.href);
  }
  document.getElementById('btnExportCSV').addEventListener('click',exportUnifiedCSV);

  // PDF generation
  async function exportPDF(){
    renderReview();
    const { jsPDF } = window.jspdf;
    const node = document.getElementById('review');
    const canvas = await html2canvas(node,{scale:2, background:'#ffffff'});
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p','mm','a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 20; // margins
    const imgH = canvas.height * imgW / canvas.width;
    let y=10;
    if(imgH<=pageH-20){ pdf.addImage(imgData,'PNG',10,y,imgW,imgH); }
    else {
      // split tall content
      let s=0; const viewH = canvas.height; const pagePix = Math.floor((pageH-20)*canvas.width/imgW);
      while(s<viewH){
        const slice = document.createElement('canvas'); slice.width=canvas.width; slice.height=Math.min(pagePix, viewH-s);
        slice.getContext('2d').drawImage(canvas,0,s,canvas.width,slice.height,0,0,canvas.width,slice.height);
        const part = slice.toDataURL('image/png');
        pdf.addImage(part,'PNG',10,10,imgW,(slice.height*imgW/canvas.width));
        s+=slice.height; if(s<viewH) pdf.addPage();
      }
    }
    pdf.save('akkord-rapport.pdf');
  }
  document.getElementById('btnExportPDF').addEventListener('click',exportPDF);
})();
