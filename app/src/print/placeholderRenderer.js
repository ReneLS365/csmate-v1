const SECTION_TAGS = ['linjer', 'totaler']

function ensureArray (value) {
  if (Array.isArray(value)) return value
  if (value == null) return []
  if (typeof value[Symbol.iterator] === 'function') {
    return Array.from(value)
  }
  return []
}

function replaceSections (template, data) {
  let output = template
  SECTION_TAGS.forEach(tag => {
    const pattern = new RegExp(`{{#${tag}}}([\\s\\S]*?){{/${tag}}}`, 'g')
    output = output.replace(pattern, (_match, inner) => {
      const items = ensureArray(data?.[tag])
      if (!items.length) return ''
      return items
        .map(item => {
          if (item && typeof item === 'object') {
            let rendered = inner
            Object.entries(item).forEach(([key, val]) => {
              const safe = val == null ? '' : String(val)
              const keyPattern = new RegExp(`{{${key}}}`, 'g')
              rendered = rendered.replace(keyPattern, safe)
            })
            return rendered
          }
          return String(item ?? '')
        })
        .join('')
    })
  })
  return output
}

function replaceScalars (template, data) {
  return template.replace(/{{(\w+)}}/g, (_match, key) => {
    const value = data?.[key]
    if (value == null) return ''
    if (typeof value === 'object') return ''
    return String(value)
  })
}

export function renderTemplate (template, data) {
  if (typeof template !== 'string' || !template) return ''
  const withSections = replaceSections(template, data || {})
  return replaceScalars(withSections, data || {})
}
