import { describe, it, expect } from 'vitest';
import { canTransition, nextStateByAction } from '../src/lib/approval.js';
import { hasPerm } from '../src/lib/approval-perms.js';
import { loadTemplate } from '../src/lib/templates.js';

function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

describe('Approval flow', () => {
  const defaultTemplate = loadTemplate('default');
  const hulmoseTemplate = loadTemplate('hulmose');

  it('arbejder må kun sende videre og tilbage under default skabelon', () => {
    const state = { role: 'arbejder', status: 'kladde', template: defaultTemplate, approvalLog: [] };
    expect(hasPerm(state, 'send')).toBe(true);
    expect(hasPerm(state, 'approve')).toBe(false);
    expect(canTransition(state, 'kladde', 'afventer')).toBe(true);
    expect(canTransition(state, 'afventer', 'godkendt')).toBe(false);
    const awaiting = nextStateByAction(state, 'afventer');
    expect(awaiting.status).toBe('afventer');
    expect(awaiting.approvalLog?.length).toBe(1);
  });

  it('chef kan godkende og afvise i hulmose skabelonen', () => {
    const state = { role: 'chef', status: 'afventer', template: hulmoseTemplate, approvalLog: [] };
    expect(hasPerm(state, 'approve')).toBe(true);
    expect(hasPerm(state, 'reject')).toBe(true);
    expect(canTransition(state, 'afventer', 'godkendt')).toBe(true);
    expect(canTransition(state, 'afventer', 'afvist')).toBe(true);
    const approved = nextStateByAction(state, 'godkendt');
    expect(approved.status).toBe('godkendt');
    const reopened = nextStateByAction(approved, 'afventer');
    expect(reopened.status).toBe('afventer');
    expect(reopened.approvalLog?.length).toBe(2);
  });

  it('kontor-rollen har udvidede rettigheder i hulmose skabelonen', () => {
    const state = { role: 'kontor', status: 'afventer', template: hulmoseTemplate, approvalLog: [] };
    expect(hasPerm(state, 'approve')).toBe(true);
    expect(hasPerm(state, 'reject')).toBe(true);
    expect(hasPerm(state, 'send')).toBe(true);
    expect(hasPerm(state, 'edit')).toBe(true);
    expect(hasPerm(state, 'administer')).toBe(true);
  });

  it('blokerer godkendelse når rollen mangler tilladelsen', () => {
    const limited = cloneTemplate(defaultTemplate);
    limited.roles.formand = ['send'];
    const state = { role: 'formand', status: 'afventer', template: limited };
    expect(hasPerm(state, 'approve')).toBe(false);
    expect(canTransition(state, 'afventer', 'godkendt')).toBe(false);
  });

  it('falder tilbage til legacy-regler når template mangler roller', () => {
    const state = { role: 'sjakbajs', status: 'kladde' };
    expect(hasPerm(state, 'send')).toBe(true);
    expect(canTransition(state, 'kladde', 'afventer')).toBe(true);
    expect(canTransition(state, 'afventer', 'godkendt')).toBe(false);
  });
});
