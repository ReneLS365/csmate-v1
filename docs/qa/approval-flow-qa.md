# Approval flow QA – 2025-02-26

## Baseline
- `npx vitest tests/approval.flow.test.js` (pass).【30a420†L1-L18】

## Rolle-hop i Hulmose-templaten
- **sjakbajs**: Kan sende mellem `kladde`/`afventer`, men kan også `godkende` og `afvise` fordi aliaset samler rettigheder fra både `arbejder` og `formand`.【d1a127†L1-L10】【F:src/modules/approval-perms.js†L9-L44】【F:src/templates/hulmose.json†L45-L66】
- **formand**: Har fulde `send`/`godkend`/`afvis`-rettigheder som defineret i templaten.【d1a127†L11-L20】【F:src/templates/hulmose.json†L59-L63】
- **kontor**: Har alle overgangsmuligheder inkl. administrative rettigheder og kan hoppe frem/tilbage mellem alle tilstande.【d1a127†L21-L30】【F:src/templates/hulmose.json†L52-L58】
- **chef**: Matcher forventningen om fulde godkendelsesrettigheder.【d1a127†L31-L40】【F:src/templates/hulmose.json†L45-L51】

## Approval-log
- Sammenkædede hop registrerer et audit-trail med tidsstempel (`at`) og rolle (`by`), og loggen vokser deterministisk ved hvert succesfuldt hop.【7d2280†L1-L14】【F:src/modules/approval.js†L68-L76】

## Afvigelser
- *Sjakbajs*-rollen kan i praksis godkende/afvise, hvilket udvisker det forventede rolle-split mod `kontor`. Alias-tabellen binder `sjakbajs` til `formand`, så rollen arver udvidede rettigheder.【d1a127†L1-L10】【F:src/modules/approval-perms.js†L9-L44】【F:src/templates/hulmose.json†L45-L66】
