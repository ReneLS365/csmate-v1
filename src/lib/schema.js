/**
 * @purpose Define the base configuration schema for CSMate deployments including auth and pricing toggles.
 * @inputs None – exports a constant schema object that can be used as defaults for persisted config stores.
 * @outputs ConfigSchema constant describing company, admin, auth, price and template defaults.
 */

const origin = (() => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  if (typeof location !== 'undefined' && location.origin) {
    return location.origin;
  }
  return 'http://localhost';
})();

export const ConfigSchema = {
  $version: 2,
  company: { id: 'hulmose', name: 'Hulmose Stilladser' },
  admin: {
    codeHash: '',
    roles: {
      admin: ['*'],
      foreman: ['approve', 'edit-workers', 'export'],
      worker: ['create', 'edit-materials']
    }
  },
  auth: {
    provider: 'ekomplet',
    oidc: {
      authority: '',
      clientId: '',
      redirectUri: `${origin}/auth/callback`,
      postLogoutRedirectUri: `${origin}/`,
      audience: '',
      scopes: 'openid profile email offline_access'
    },
    roleMapping: {
      rules: [
        { claim: 'roles', contains: 'csmate_admin', to: 'admin' },
        { claim: 'roles', contains: 'csmate_foreman', to: 'foreman' },
        { claim: 'roles', contains: 'csmate_worker', to: 'worker' }
      ],
      fallback: 'worker'
    },
    domainRules: []
  },
  prices: {},
  wages: {},
  materials: { items: [], currency: 'DKK', version: '' },
  branding: { appName: 'CSMate', legal: '© CSMate – udviklet af René Løwe Sørensen.' },
  toggles: { approvalFlow: true, exportEkomplet: true, offlineSync: true },
  export: { ekomplet: { format: 'csv', delimiter: ';' } }
};
