import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
const sources = ["dataset.js", "app/dataset.js", "data/dataset.js"];
const sourcePath = sources.find((candidate) => existsSync(candidate));
if (!sourcePath) {
  console.error("dataset.js not found. Checked:", sources.join(", "));
  process.exit(1);
}
const src = readFileSync(sourcePath, "utf8");
const sandbox = Object.create(null);
const data = runInNewContext(
  `${src};({
    BOSTA_DATA: typeof BOSTA_DATA !== 'undefined' ? BOSTA_DATA : [],
    HAKI_DATA: typeof HAKI_DATA !== 'undefined' ? HAKI_DATA : [],
    MODEX_DATA: typeof MODEX_DATA !== 'undefined' ? MODEX_DATA : [],
    ALFIX_DATA: typeof ALFIX_DATA !== 'undefined' ? ALFIX_DATA : []
  })`,
  sandbox
);
const bosta = data.BOSTA_DATA || [];
const haki = data.HAKI_DATA || [];
const modex = data.MODEX_DATA || [];
const alfix = data.ALFIX_DATA || [];
const price_table = {};
const items = [];
function add(arr, system) {
  for (const it of arr) {
    if (!it.varenr) continue;
    price_table[it.varenr] = Number(it.pris ?? 0);
    items.push({
      code: it.varenr,
      system,
      name: it.navn ?? it.varenr,
      unit: it.enhed ?? "",
      price: Number(it.pris ?? 0),
    });
  }
}
add(bosta, "BOSTA70");
add(haki,  "HAKI");
add(modex, "MODEX");
if (alfix.length) {
  add(alfix, "ALFIX");
} else {
  const fallback = [
    ["A001","VARIO spær 4 m","stk"],["A002","VARIO spær 6 m","stk"],
    ["A003","VARIO spær 8 m","stk"],["A004","Alu-drager pr. m","m"],
    ["A005","Kipfinger / beslag","stk"],["A006","Samlebeslag spær","stk"],
    ["A007","Tagdug pr. m²","m2"],["A008","Net pr. m² (Alfix)","m2"],
    ["A009","Ophæng/krog","stk"],["A010","Endebeslag / gavlkit","stk"]
  ];
  for (const [code,name,unit] of fallback) {
    price_table[code] = 0;
    items.push({ code, system:"ALFIX", name, unit, price:0 });
  }
}
const doc = {
  _meta: {
    company: "Hulmose Stilladser ApS",
    template: "hulmose",
    currency: "DKK",
    source: `${sourcePath} (BOSTA/HAKI/MODEX/ALFIX*)`,
    generated: new Date().toISOString().slice(0,10),
    admin_code: "3fd932ed5c3da33973a205e2b111718537bd089e6516eb077cbc6176b5b6db0d",
    systems: ["BOSTA70","HAKI","MODEX","ALFIX"]
  },
  pay: {
    base_wage_hourly: 147,
    allowances_per_hour: { udd1: 42.98, udd2: 49.38, mentor: 22.26 },
    overtime_multipliers: { weekday: 1.5, weekend: 2 }
  },
  transport_rules: {
    included_distance_m: 15,
    tiers: [
      { from_m: 15, to_m: 55, step_m: 10, percent: 7 },
      { from_m: 55, step_m: 20, percent: 7 }
    ],
    notes: "HP3 Provinsen (transport) – kan justeres i admin"
  },
  roles: {
    chef:    ["approve","reject","send","edit"],
    kontor:  ["approve","reject","send","edit","administer"],
    formand: ["approve","reject","send"],
    arbejder:["send"]
  },
  price_table,
  items
};
writeFileSync("templates/hulmose.json", JSON.stringify(doc, null, 2), "utf8");
writeFileSync("public/templates/hulmose.json", JSON.stringify(doc, null, 2), "utf8");
const countBy = (sys) => items.filter(i => i.system===sys).length;
console.log("✔ hulmose.json skrevet.");
console.log("  BOSTA:", countBy("BOSTA70"),
            "HAKI:", countBy("HAKI"),
            "MODEX:", countBy("MODEX"),
            "ALFIX:", countBy("ALFIX"));
