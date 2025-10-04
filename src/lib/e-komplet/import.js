const normalize = header =>
  (header ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const DEFAULT_CANONICAL_HEADERS = [
  { key: 'worker', header: 'Worker', aliases: [] },
  { key: 'hour', header: 'Hour', aliases: [] }
];

export function needsMapping(headers = [], canonicalHeaders = DEFAULT_CANONICAL_HEADERS) {
  const normalizedHeaders = new Set(headers.map(normalize));

  return canonicalHeaders.some(({ header, aliases = [] }) => {
    const candidates = [header, ...aliases];
    return !candidates.some(candidate => normalizedHeaders.has(normalize(candidate)));
  });
}

function buildRowLookup(row = {}) {
  const lookup = new Map();
  for (const [header, value] of Object.entries(row)) {
    const key = normalize(header);
    if (!lookup.has(key)) {
      lookup.set(key, value);
    }
  }
  return lookup;
}

function toMappingLookup(mapping) {
  const lookup = new Map();
  if (!Array.isArray(mapping)) {
    return lookup;
  }

  for (const entry of mapping) {
    if (!entry) continue;
    const canonical = entry.canonical ?? entry.target ?? entry.header;
    const source = entry.source ?? entry.from ?? entry.value;
    if (!canonical || !source) continue;

    const canonicalKey = normalize(canonical);
    if (!lookup.has(canonicalKey)) {
      lookup.set(canonicalKey, { source });
    }
  }

  return lookup;
}

export function applyMapping(row = {}, mapping = null, canonicalHeaders = DEFAULT_CANONICAL_HEADERS) {
  const normalizedRow = buildRowLookup(row);
  const mappingLookup = toMappingLookup(mapping);
  const result = {};

  for (const { header, aliases = [] } of canonicalHeaders) {
    const canonicalKey = normalize(header);
    const mappingEntry = mappingLookup.get(canonicalKey);
    const candidateSources = [];

    if (mappingEntry) {
      candidateSources.push(mappingEntry.source);
    }

    candidateSources.push(header, ...aliases);

    const seen = new Set();
    let value;

    for (const candidate of candidateSources) {
      const normalizedCandidate = normalize(candidate);
      if (!normalizedCandidate || seen.has(normalizedCandidate)) {
        continue;
      }
      seen.add(normalizedCandidate);

      if (normalizedRow.has(normalizedCandidate)) {
        value = normalizedRow.get(normalizedCandidate);
        break;
      }
    }

    result[header] = value ?? '';
  }

  return result;
}
