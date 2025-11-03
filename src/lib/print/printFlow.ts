import { buildPrintableDataForSystem } from './dataMapping';
import { renderTemplate } from './placeholderRenderer';
import { loadTemplate } from './templateLoader';

type PrintableSystem = 'bosta' | 'haki' | 'modex' | 'alfix';

export class PopupBlockedError extends Error {
  code = 'POPUP_BLOCKED';

  constructor(message = 'Popup blev blokeret') {
    super(message);
    this.name = 'PopupBlockedError';
  }
}

const PRINT_DELAY_MS = 250;

function uniqueSystems(systems: PrintableSystem[]): PrintableSystem[] {
  const seen = new Set<PrintableSystem>();
  const ordered: PrintableSystem[] = [];
  systems.forEach((system) => {
    if (!system) return;
    const key = system.toLowerCase() as PrintableSystem;
    if (!['bosta', 'haki', 'modex', 'alfix'].includes(key)) return;
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  });
  return ordered;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeAndPrint(system: PrintableSystem) {
  if (typeof window === 'undefined') {
    throw new Error('Print kræver et browsermiljø');
  }
  const popup = window.open('', '_blank');
  if (!popup) {
    throw new PopupBlockedError();
  }

  try {
    const [template, data] = await Promise.all([
      loadTemplate(system),
      Promise.resolve(buildPrintableDataForSystem(system))
    ]);
    const markup = renderTemplate(template, data);
    popup.document.open();
    popup.document.write(markup);
    popup.document.close();
    await delay(PRINT_DELAY_MS);
    if (typeof popup.focus === 'function') {
      popup.focus();
    }
    if (typeof popup.print === 'function') {
      popup.print();
    }
  } catch (error) {
    try {
      popup.close();
    } catch {
      // ignore
    }
    throw error;
  }
}

export async function printAkkordsedlerFor(systems: PrintableSystem[]): Promise<void> {
  const list = uniqueSystems(Array.isArray(systems) ? systems : []);
  if (list.length === 0) return;
  for (const system of list) {
    await writeAndPrint(system);
  }
}
