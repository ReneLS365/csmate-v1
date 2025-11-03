const SECTION_TAGS = ['linjer', 'totaler'] as const;

type TemplateData = Record<string, any>;

function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof (value as any)[Symbol.iterator] === 'function') {
    return Array.from(value as Iterable<any>);
  }
  return [];
}

function replaceSections(template: string, data: TemplateData): string {
  let output = template;
  for (const tag of SECTION_TAGS) {
    const pattern = new RegExp(`{{#${tag}}}([\\s\\S]*?){{/${tag}}}`, 'g');
    output = output.replace(pattern, (_match, inner) => {
      const value = data?.[tag];
      const items = ensureArray(value);
      if (items.length === 0) {
        return '';
      }
      return items
        .map((item) => {
          if (item && typeof item === 'object') {
            let rendered = inner;
            for (const [key, val] of Object.entries(item)) {
              const safeValue = val == null ? '' : String(val);
              const keyPattern = new RegExp(`{{${key}}}`, 'g');
              rendered = rendered.replace(keyPattern, safeValue);
            }
            return rendered;
          }
          return String(item ?? '');
        })
        .join('');
    });
  }
  return output;
}

function replaceScalars(template: string, data: TemplateData): string {
  return template.replace(/{{(\w+)}}/g, (_match, key) => {
    const value = data?.[key];
    if (value == null) return '';
    if (typeof value === 'object') return '';
    return String(value);
  });
}

export function renderTemplate(template: string, data: TemplateData): string {
  if (typeof template !== 'string' || template.length === 0) {
    return '';
  }
  const withSections = replaceSections(template, data ?? {});
  return replaceScalars(withSections, data ?? {});
}
