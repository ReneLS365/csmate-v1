const EMPTY_OBJECT = Object.freeze({});
let byCode = EMPTY_OBJECT;
let prices = EMPTY_OBJECT;

export function buildItemMaps(template) {
  const items = Array.isArray(template?.items) ? template.items : [];
  const map = Object.create(null);
  for (const item of items) {
    if (!item || typeof item.code !== 'string') continue;
    map[item.code] = item;
  }
  byCode = map;
  prices = { ...(template?.price_table || {}) };
}

export const getItemLabel = (code) => (byCode[code]?.name ?? code ?? '');
export const getItemUnit = (code) => (byCode[code]?.unit ?? '');
export const getItemSystem = (code) => (byCode[code]?.system ?? '');
export const getItemPrice = (code) => {
  const value = prices[code];
  return Number.isFinite(Number(value)) ? Number(value) : 0;
};

export function formatLine(code, qty) {
  const quantity = Number.isFinite(Number(qty)) ? Number(qty) : 0;
  const price = getItemPrice(code);
  const total = Number((price * quantity).toFixed(2));
  return {
    code,
    name: getItemLabel(code),
    unit: getItemUnit(code),
    price,
    qty: quantity,
    total
  };
}
