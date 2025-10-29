/**
 * @purpose Provide deterministic default application state including session snapshot and accord inputs.
 * @inputs None – consumer imports the defaultState constant when creating fresh store instances.
 * @outputs defaultState object with sane zeroed values for calculations and auth session placeholders.
 */

export const defaultState = {
  config: null,
  session: { user: null, role: 'guest', idToken: null, accessToken: null, expiresAt: 0 },
  totals: { materials: 0 },
  km: 0,
  hoursTotal: 0,
  sledPercent: null,
  kmRate: null,
  holesQty: 0,
  closeHoleQty: 0,
  concreteQty: 0,
  foldingRailQty: 0,
  trolleyLiftQty: 0,
  holePrice: null,
  closeHolePrice: null,
  concretePrice: null,
  foldingRailPrice: null,
  trolleyLiftPrice: null,
  addOns: { udd1: null, udd2: null, mentor: null },
  status: 'kladde',
  workers: []
};
