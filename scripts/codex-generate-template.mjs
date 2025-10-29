#!/usr/bin/env node
/**
 * @purpose Generate a tenant template JSON document with BOSTA rounding.
 * @inputs CLI flags. Use --help for details.
 * @outputs Writes JSON to stdout or a file path provided via --out.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const usage = `\nUsage: node scripts/codex-generate-template.mjs [options]\n\nOptions:\n  --company <name>          Company name (required)\n  --template <id>           Template identifier (required)\n  --admin <code>            Admin code for price editing (required)\n  --base-wage <number>      Base hourly wage (required)\n  --allowance <k:v>         Allowance entry per hour (repeatable)\n  --role <name:perm,...>    Role permissions comma separated (repeatable)\n  --currency <code>         Currency code (default: DKK)\n  --source <text>           Price source label (default: BOSTA 2025)\n  --generated <date>        Date stamp YYYY-MM-DD (default: today)\n  --out <file>              Write output to file instead of stdout\n  --help                    Show this message\n`;

function parseArgs(rawArgs) {
  const args = { allowances: new Map(), roles: new Map() };
  const queue = [...rawArgs];
  while (queue.length) {
    const flag = queue.shift();
    switch (flag) {
      case '--help':
        args.help = true;
        break;
      case '--company':
      case '--template':
      case '--admin':
      case '--base-wage':
      case '--currency':
      case '--source':
      case '--generated':
      case '--out': {
        const value = queue.shift();
        if (!value) throw new Error(`Missing value for ${flag}`);
        args[flag.slice(2).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
        break;
      }
      case '--allowance': {
        const value = queue.shift();
        if (!value) throw new Error('Missing value for --allowance');
        const [key, raw] = value.split(/[:=]/);
        if (!key || raw === undefined) throw new Error('Allowances must be formatted key:value');
        args.allowances.set(key, Number(raw));
        break;
      }
      case '--role': {
        const value = queue.shift();
        if (!value) throw new Error('Missing value for --role');
        const [role, rawPerms] = value.split(/[:=]/);
        if (!role || rawPerms === undefined) throw new Error('Roles must be formatted name:perm1,perm2');
        const permissions = rawPerms.split(',').map(item => item.trim()).filter(Boolean);
        args.roles.set(role, permissions);
        break;
      }
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }
  return args;
}

function ensureRequired(args, keys) {
  for (const key of keys) {
    if (!args[key]) {
      throw new Error(`Missing required option --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    }
  }
}

function hashAdminCode(code) {
  if (typeof code !== 'string' || !code) {
    throw new Error('Missing required option --admin');
  }
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function toPlainObject(map) {
  return Object.fromEntries([...map.entries()].map(([k, v]) => [k, v]));
}

function roundPrice(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage);
    return;
  }

  ensureRequired(args, ['company', 'template', 'admin', 'baseWage']);

  const materialsPath = path.resolve(process.cwd(), 'app', 'data', 'materials.json');
  const raw = await readFile(materialsPath, 'utf8');
  const materials = JSON.parse(raw);

  const priceTable = Object.fromEntries(
    materials.map(item => {
      if (!item.id) {
        throw new Error('Materials JSON entries must include an id');
      }
      return [item.id, roundPrice(item.price)];
    })
  );

  const template = {
    _meta: {
      company: args.company,
      template: args.template,
      currency: args.currency ?? 'DKK',
      source: args.source ?? 'BOSTA 2025',
      generated: args.generated ?? new Date().toISOString().slice(0, 10),
      admin_code: hashAdminCode(args.admin)
    },
    pay: {
      base_wage_hourly: Number(args.baseWage),
      allowances_per_hour: toPlainObject(args.allowances),
      overtime_multipliers: {
        weekday: 1.5,
        weekend: 2
      }
    },
    roles: toPlainObject(args.roles.size ? args.roles : new Map([
      ['chef', ['approve', 'reject', 'send', 'edit']],
      ['formand', ['approve', 'reject', 'send']],
      ['arbejder', ['send']]
    ])),
    price_table: priceTable
  };

  const serialized = `${JSON.stringify(template, null, 2)}\n`;

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    await writeFile(outPath, serialized, 'utf8');
  } else {
    process.stdout.write(serialized);
  }
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
