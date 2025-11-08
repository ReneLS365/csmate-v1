/**
 * Persist a default test user in localStorage before the app loads.
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, role: string }} [user]
 */
export async function primeTestUser (page, user = { name: 'E2E Tester', role: 'formand' }) {
  await page.addInitScript(value => {
    window.localStorage.setItem('csmate.user.v1', JSON.stringify(value))
  }, user)
}
