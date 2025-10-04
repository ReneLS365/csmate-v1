import { needsMapping } from '../lib/e-komplet/import.js';

const normalize = value =>
  (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const DEFAULT_IMPORT_SERVICE = ({ rows }) => rows;

export class EKompletPanel {
  constructor({ importService = DEFAULT_IMPORT_SERVICE } = {}) {
    this._importService = importService;
    this._savedMapping = null;
  }

  setSavedMapping(mapping) {
    this._savedMapping = Array.isArray(mapping) ? [...mapping] : null;
  }

  getSavedMapping() {
    return this._savedMapping ? [...this._savedMapping] : null;
  }

  _handleImport({ headers = [], rows = [] } = {}) {
    const mapping = this._selectMapping(headers);
    return this._importService({ headers, rows, mapping });
  }

  _selectMapping(headers) {
    if (!needsMapping(headers)) {
      return null;
    }

    const mapping = this._savedMapping;
    if (!Array.isArray(mapping) || mapping.length === 0) {
      return null;
    }

    const normalizedHeaders = new Set(headers.map(normalize));
    const filtered = mapping.filter(entry => {
      if (!entry || !entry.source) {
        return false;
      }
      const normalizedSource = normalize(entry.source);
      return normalizedHeaders.has(normalizedSource);
    });

    return filtered.length > 0 ? filtered : null;
  }
}
