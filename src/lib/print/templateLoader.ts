const BASE_PATH = '/templates/2025';

const KNOWN_SYSTEMS = new Set(['bosta', 'haki', 'modex', 'alfix']);

function normaliseSystem(system: string): 'bosta' | 'haki' | 'modex' | 'alfix' {
  const key = (system ?? '').toLowerCase();
  if (!KNOWN_SYSTEMS.has(key)) {
    throw new TypeError(`Ukendt system: ${system}`);
  }
  return key as 'bosta' | 'haki' | 'modex' | 'alfix';
}

export async function loadTemplate(system: 'bosta' | 'haki' | 'modex' | 'alfix'): Promise<string> {
  const sys = normaliseSystem(system);
  const url = `${BASE_PATH}/${sys}.html`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Kunne ikke hente skabelon ${sys}: HTTP ${response.status}`);
  }
  return response.text();
}
