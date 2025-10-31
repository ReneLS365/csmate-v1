const envTemplate =
  (typeof process !== 'undefined' && process.env && process.env.TEMPLATE) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TEMPLATE);

export const DEFAULT_TEMPLATE = typeof envTemplate === 'string' && envTemplate.length > 0
  ? envTemplate
  : 'hulmose';

export async function loadTemplate(name = DEFAULT_TEMPLATE) {
  const target = typeof name === 'string' && name.length > 0 ? name : DEFAULT_TEMPLATE;
  const res = await fetch(`/templates/${target}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Template load failed: ${res.status}`);
  return await res.json();
}
