import { selectComputed } from '@/store/selectors';

type PrintableSystem = 'bosta' | 'haki' | 'modex' | 'alfix';

type PrintableLine = {
  varenr: string;
  navn: string;
  enhed: string;
  pris: string;
  antal: string;
  sum: string;
  __unitPrice?: number;
  __quantity?: number;
  __total?: number;
};

type PrintableTotal = {
  label: string;
  value: string;
};

type ExtraEntry = {
  label: string;
  sum: number;
};

type PrintableData = {
  firma: string;
  projekt: string;
  adresse: string;
  sagsnr: string;
  dagsdato: string;
  system: string;
  linjer: PrintableLine[];
  totaler: PrintableTotal[];
  wage?: number;
  extras: ExtraEntry[];
  materialSum: number;
  montage: number;
  demontage: number;
  extrasTotal: number;
  total: number;
};

type DatasetEntry = {
  varenr?: string;
  varenummer?: string;
  id?: string | number;
  code?: string;
  navn?: string;
  name?: string;
  beskrivelse?: string;
  enhed?: string;
  unit?: string;
  pris?: number;
  price?: number;
};

type CartEntry = {
  varenr?: string;
  id?: string | number;
  code?: string;
  navn?: string;
  name?: string;
  enhed?: string;
  unit?: string;
  pris?: number;
  price?: number;
  antal?: number;
  qty?: number;
  quantity?: number;
  count?: number;
  sum?: number;
};

const NUMBER_FORMATTER = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const QTY_FORMATTER = new Intl.NumberFormat('da-DK', {
  maximumFractionDigits: 2
});

const GLOBAL_DATA_KEYS: Record<PrintableSystem, string> = {
  bosta: 'BOSTA_DATA',
  haki: 'HAKI_DATA',
  modex: 'MODEX_DATA',
  alfix: 'ALFIX_DATA'
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value: number): string {
  return NUMBER_FORMATTER.format(toNumber(value));
}

function formatQty(value: number): string {
  return QTY_FORMATTER.format(toNumber(value));
}

function resolveDateString(value: unknown): string {
  const candidate = typeof value === 'string' ? value : null;
  if (candidate && candidate.trim().length >= 4) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('da-DK').format(parsed);
    }
  }
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('da-DK').format(value);
  }
  return new Intl.DateTimeFormat('da-DK').format(new Date());
}

function getGlobal<T = unknown>(key: string): T | undefined {
  if (!key) return undefined;
  if (typeof globalThis !== 'undefined' && key in (globalThis as Record<string, unknown>)) {
    return (globalThis as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

function normaliseDatasetEntry(entry: DatasetEntry | undefined | null): DatasetEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  return entry;
}

function buildDatasetMap(system: PrintableSystem, state: Record<string, any>): Map<string, DatasetEntry> {
  const map = new Map<string, DatasetEntry>();
  const globalKey = GLOBAL_DATA_KEYS[system];
  const globalDataset = getGlobal<DatasetEntry[]>(globalKey);
  const templateItems = Array.isArray(state?.template?.items)
    ? state.template.items.filter((item: any) => {
        const sysKey = typeof item?.system === 'string' ? item.system.toLowerCase() : '';
        return sysKey === system;
      })
    : [];
  const templateTable = state?.template?.price_table ?? state?.template?.priceTable ?? {};
  const priceTable = state?.priceTable ?? state?.price_table ?? {};
  const dataSources: Array<DatasetEntry[] | null | undefined> = [
    Array.isArray(state?.catalogues?.[system]) ? state.catalogues[system] : undefined,
    Array.isArray(state?.datasets?.[system]) ? state.datasets[system] : undefined,
    Array.isArray(state?.materials?.[system]) ? state.materials[system] : undefined,
    Array.isArray(state?.priceLists?.[system]) ? state.priceLists[system] : undefined,
    Array.isArray(state?.cart?.[system]?.items) ? state.cart[system].items : undefined,
    globalDataset,
    templateItems
  ];

  const addEntry = (entry: DatasetEntry) => {
    const normalised = normaliseDatasetEntry(entry);
    if (!normalised) return;
    const rawKey = normalised.varenr ?? normalised.varenummer ?? normalised.code ?? normalised.id;
    if (rawKey == null) return;
    const key = String(rawKey);
    if (!map.has(key)) {
      if (!Number.isFinite(Number(normalised.pris)) && Number.isFinite(Number(normalised.price))) {
        normalised.pris = Number(normalised.price);
      }
      map.set(key, normalised);
    }
  };

  for (const source of dataSources) {
    if (!Array.isArray(source)) continue;
    source.forEach(addEntry);
  }

  const priceEntries = Object.entries({ ...templateTable, ...priceTable });
  for (const [rawKey, value] of priceEntries) {
    const key = String(rawKey);
    const current = map.get(key) ?? {};
    if (!Number.isFinite(Number(current.pris))) {
      current.pris = Number(value);
    }
    map.set(key, current);
  }

  return map;
}

function resolveCartEntries(raw: unknown): CartEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as CartEntry[];
  if (typeof raw === 'object') {
    const obj = raw as Record<string, any>;
    if (Array.isArray(obj.lines)) {
      return obj.lines as CartEntry[];
    }
    return Object.entries(obj).map(([key, value]) => ({
      ...(typeof value === 'object' && value !== null ? (value as CartEntry) : {}),
      code: key
    }));
  }
  return [];
}

function normaliseLine(entry: CartEntry, dataset: Map<string, DatasetEntry>): PrintableLine | null {
  if (!entry) return null;
  const rawKey = entry.varenr ?? entry.code ?? entry.id;
  if (rawKey == null) return null;
  const key = String(rawKey);
  const datasetEntry = dataset.get(key) ?? dataset.get(String(entry.code ?? entry.id ?? entry.varenr ?? ''));
  const unitPrice = Number.isFinite(Number(entry.pris))
    ? Number(entry.pris)
    : Number.isFinite(Number(entry.price))
      ? Number(entry.price)
      : Number(datasetEntry?.pris) || Number(datasetEntry?.price) || 0;
  const qty = Number.isFinite(Number(entry.antal))
    ? Number(entry.antal)
    : Number.isFinite(Number(entry.qty))
      ? Number(entry.qty)
      : Number(entry.quantity) || 0;
  if (qty <= 0 || !Number.isFinite(qty)) {
    return null;
  }
  const total = Number((unitPrice * qty).toFixed(2));
  const name = entry.navn ?? entry.name ?? datasetEntry?.navn ?? datasetEntry?.name ?? datasetEntry?.beskrivelse ?? key;
  const unit = entry.enhed ?? entry.unit ?? datasetEntry?.enhed ?? datasetEntry?.unit ?? '';
  return {
    varenr: key,
    navn: name,
    enhed: unit,
    pris: formatCurrency(unitPrice),
    antal: formatQty(qty),
    sum: formatCurrency(total),
    __unitPrice: unitPrice,
    __quantity: qty,
    __total: total
  };
}

function normaliseExtras(raw: unknown): ExtraEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const label = String((entry as Record<string, any>).label ?? (entry as Record<string, any>).navn ?? 'Ekstra');
        const sum = toNumber((entry as Record<string, any>).sum ?? (entry as Record<string, any>).total);
        return { label, sum };
      })
      .filter((entry): entry is ExtraEntry => Boolean(entry));
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, any>).map(([label, value]) => ({
      label,
      sum: toNumber((value as any)?.sum ?? value)
    }));
  }
  return [];
}

function resolveState(): Record<string, any> {
  const globalAny = globalThis as Record<string, any>;
  const store = globalAny?.__APP_STORE__;
  if (store && typeof store.getState === 'function') {
    try {
      return store.getState() ?? {};
    } catch {
      // ignore
    }
  }
  if (globalAny?.__APP_STATE__ && typeof globalAny.__APP_STATE__ === 'object') {
    return globalAny.__APP_STATE__;
  }
  return {};
}

function resolveComputed(state: Record<string, any>): Record<string, any> {
  try {
    return selectComputed(state);
  } catch {
    return {};
  }
}

function resolveJobType(state: Record<string, any>): string {
  if (typeof state?.jobType === 'string') return state.jobType;
  if (typeof state?.sagsinfo?.jobType === 'string') return state.sagsinfo.jobType;
  return '';
}

function shouldIncludeDemontage(state: Record<string, any>): boolean {
  if (typeof state?.includeDemontage === 'boolean') return state.includeDemontage;
  const jobType = resolveJobType(state).toLowerCase();
  return jobType === 'demontage' || jobType === 'montage+demontage';
}

function resolveInfoField(state: Record<string, any>, key: string, fallback = ''): string {
  const direct = state?.[key];
  if (typeof direct === 'string' && direct.trim().length) return direct.trim();
  const info = state?.sagsinfo ?? state?.project ?? {};
  const value = info?.[key];
  if (typeof value === 'string' && value.trim().length) return value.trim();
  switch (key) {
    case 'firma':
      return state?.company?.name ?? state?.firma ?? '';
    case 'projekt':
      return state?.projectName ?? state?.projekt ?? '';
    case 'adresse':
      return state?.address ?? state?.adresse ?? '';
    case 'sagsnr':
      return state?.caseNumber ?? state?.sagsnr ?? '';
    default:
      return fallback;
  }
}

function resolveCaseFields(state: Record<string, any>) {
  const info = state?.sagsinfo ?? {};
  const firma = resolveInfoField(state, 'firma', info?.kunde ?? state?.kunde ?? '');
  const projekt = resolveInfoField(state, 'projekt', info?.navn ?? state?.navn ?? state?.projekt ?? '');
  const adresse = resolveInfoField(state, 'adresse', info?.adresse ?? state?.adresse ?? '');
  const sagsnr = resolveInfoField(state, 'sagsnr', info?.sagsnummer ?? state?.sagsnummer ?? '');
  const dagsdato = resolveDateString(state?.dagsdato ?? info?.dato ?? state?.dato ?? state?.date);
  return { firma, projekt, adresse, sagsnr, dagsdato };
}

export function buildPrintableDataForSystem(system: PrintableSystem): PrintableData {
  const state = resolveState();
  const dataset = buildDatasetMap(system, state);
  const cartEntries = resolveCartEntries(state?.cart?.[system]);
  const lines = cartEntries
    .map((entry) => normaliseLine(entry, dataset))
    .filter((entry): entry is PrintableLine => Boolean(entry));

  const materialSum = lines.reduce((sum, line) => sum + toNumber(line.__total), 0);
  const montage = materialSum;
  const demontage = shouldIncludeDemontage(state) ? materialSum * 0.5 : 0;
  const extras = normaliseExtras(state?.extras);
  const extrasTotal = extras.reduce((sum, entry) => sum + toNumber(entry.sum), 0);
  const total = materialSum + montage + demontage + extrasTotal;

  const totals: PrintableTotal[] = [
    { label: 'Materialer', value: `${formatCurrency(materialSum)} kr` },
    { label: 'Montage', value: `${formatCurrency(montage)} kr` }
  ];
  if (demontage > 0) {
    totals.push({ label: 'Demontage', value: `${formatCurrency(demontage)} kr` });
  }
  totals.push({ label: 'Ekstraarbejde', value: `${formatCurrency(extrasTotal)} kr` });
  totals.push({ label: 'I alt', value: `${formatCurrency(total)} kr` });

  const computed = resolveComputed(state);
  const wage = Number.isFinite(Number(state?.wage))
    ? Number(state.wage)
    : Number.isFinite(Number(computed?.montoerLonMedTillaeg))
      ? Number(computed.montoerLonMedTillaeg)
      : Number.isFinite(Number(state?.totals?.labor))
        ? Number(state.totals.labor)
        : undefined;

  const extrasList = extras.map((entry) => ({ label: entry.label, sum: entry.sum }));
  const { firma, projekt, adresse, sagsnr, dagsdato } = resolveCaseFields(state);

  return {
    firma,
    projekt,
    adresse,
    sagsnr,
    dagsdato,
    system: system.toUpperCase(),
    linjer: lines,
    totaler: totals,
    wage,
    extras: extrasList,
    materialSum,
    montage,
    demontage,
    extrasTotal,
    total
  };
}
