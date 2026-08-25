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

test.describe('Cloudflare Turnstile — module Disabled=true (control / baseline)', () => {
  test.skip(
    !hasCredentials(),
    'Set E2E_LOGIN_PRIMARY/E2E_PASSWORD_PRIMARY in .env.e2e'
  )

  test('no widget renders and login works with no Turnstile requirement at all', async ({
    page,
  }) => {
    test.setTimeout(T(90000))

    await step('Open login page — module disabled, nothing Turnstile-related loads', async () => {
      await page.context().clearCookies()
      await page.goto('')
      await page
        .getByTestId(sel('loginEmail'))
        .waitFor({ state: 'visible', timeout: T(30000) })

      const settings = await getTurnstileSettings(page)
      test.skip(
        settings !== null,
        'Server config mismatch: expected the module fully Disabled (bootstrap ' +
          'payload has no CloudflareTurnstileWebclientPlugin key). See ' +
          'test/e2e/README.md "Server-side config per scenario" (Scenario C).'
      )

      const hasIframe = await page
        .locator('iframe')
        .count()
      const hasWindowTurnstile = await page.evaluate(
        () => typeof window.turnstile !== 'undefined'
      )
      expect(hasIframe, 'no Turnstile iframe should render').toBe(0)
      expect(
        hasWindowTurnstile,
        'window.turnstile should never load'
      ).toBe(false)
    })

    await loginAsTestUser(page)
  })
})
