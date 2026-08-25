const path = require('path')
const { sharedHelper, moduleHelper } = require(
  path.join(process.env.AURORA_E2E_ROOT, 'helpers/paths')
)
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { step, attachScreenshot, loginAsTestUser, hasCredentials } =
  sharedHelper('login')
const { getTurnstileSettings } = moduleHelper(
  'CloudflareTurnstileWebclientPlugin',
  'turnstile-api'
)

// Cloudflare's "always passes" test sitekey — see modules/CloudflareTurnstileWebclientPlugin/README.md
const ALWAYS_PASS_SITEKEY = '1x00000000000000000000AA'

test.describe('Cloudflare Turnstile — widget renders and lets the user log in', () => {
  test.skip(
    !hasCredentials(),
    'Set E2E_LOGIN_PRIMARY/E2E_PASSWORD_PRIMARY in .env.e2e'
  )

  test('renders a Turnstile iframe on the login form and completes login', async ({
    page,
  }) => {
    test.setTimeout(T(120000))

    await step('Open login page (clean session)', async () => {
      await page.context().clearCookies()
      await page.goto('')
    })

    await step('Check live server config for this scenario', async () => {
      const settings = await getTurnstileSettings(page)
      test.skip(
        !settings ||
          !settings.ShowTurnstile ||
          settings.SiteKey !== ALWAYS_PASS_SITEKEY,
        'Server config mismatch: expected the module enabled with the always-pass ' +
          `test sitekey (${ALWAYS_PASS_SITEKEY}) and ShowTurnstile=true. ` +
          'See test/e2e/README.md "Server-side config per scenario" (Scenario A).'
      )
    })

    await step('Turnstile widget loads and renders an iframe', async () => {
      await page.waitForFunction(
        () => typeof window.turnstile !== 'undefined',
        undefined,
        { timeout: T(15000) }
      )
      // The widget's confirmation UI (e.g. the "Success!" banner for the
      // always-pass test sitekey) renders inside an iframe whose src is not
      // reliably challenges.cloudflare.com (Cloudflare proxies/redirects
      // internally), and a strict CSS-visibility check on a specific iframe
      // locator flakes while Cloudflare swaps interim/final iframes during
      // its own internal repaint. page.frames() reliably counts it instead:
      // the main frame plus the widget's own iframe = 2.
      await expect
        .poll(() => page.frames().length, { timeout: T(15000) })
        .toBeGreaterThan(1)
    })

    // loginAsTestUser() reuses the shared, Turnstile-aware login flow
    // (waits for a token via window.turnstile.getResponse(), then submits).
    await loginAsTestUser(page)

    await attachScreenshot(page, 'turnstile-widget-login-success')
  })
})
