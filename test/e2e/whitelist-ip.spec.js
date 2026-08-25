const path = require('path')
const { sharedHelper, moduleHelper } = require(
  path.join(process.env.AURORA_E2E_ROOT, 'helpers/paths')
)
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { sel } = sharedHelper('app-variant')
const { step, loginAsTestUser, hasCredentials } = sharedHelper('login')
const { getTurnstileSettings } = moduleHelper(
  'CloudflareTurnstileWebclientPlugin',
  'turnstile-api'
)

/**
 * Requires the Playwright runner's own outbound IP to be listed in
 * WhitelistIPs (see test/e2e/README.md "Server-side config per scenario",
 * Scenario E) — Module.php::isTurnstileEnabledForIP() checks the request's
 * client IP against CIDR ranges in WhitelistIPs and turns ShowTurnstile off
 * for a match. There is no way to assert this from a fixed IP-independent
 * config, so the precondition check below is the only guard.
 */
test.describe('Cloudflare Turnstile — WhitelistIPs exempts the caller', () => {
  test.skip(
    !hasCredentials(),
    'Set E2E_LOGIN_PRIMARY/E2E_PASSWORD_PRIMARY in .env.e2e'
  )

  test('no widget is shown and login succeeds normally for a whitelisted IP', async ({
    page,
  }) => {
    test.setTimeout(T(90000))

    await step('Open login page — no Turnstile widget for a whitelisted IP', async () => {
      await page.context().clearCookies()
      await page.goto('')
      await page
        .getByTestId(sel('loginEmail'))
        .waitFor({ state: 'visible', timeout: T(30000) })

      const settings = await getTurnstileSettings(page)
      test.skip(
        !settings || settings.ShowTurnstile !== false,
        'Server config mismatch: expected the module enabled+configured but ' +
          'ShowTurnstile=false, i.e. this runner\'s outbound IP is present in ' +
          'WhitelistIPs. See test/e2e/README.md "Server-side config per scenario" ' +
          '(Scenario E).'
      )

      const hasIframe = await page
        .locator('iframe')
        .count()
      expect(
        hasIframe,
        'no Turnstile iframe should render for a whitelisted IP'
      ).toBe(0)
    })

    await loginAsTestUser(page)
  })
})
