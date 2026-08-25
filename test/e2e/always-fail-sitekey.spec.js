const path = require('path')
const { sharedHelper, moduleHelper } = require(
  path.join(process.env.AURORA_E2E_ROOT, 'helpers/paths')
)
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { sel } = sharedHelper('app-variant')
const {
  step,
  attachScreenshot,
  fieldControl,
  getPrimaryCredentials,
  hasCredentials,
} = sharedHelper('login')
const { getTurnstileSettings } = moduleHelper(
  'CloudflareTurnstileWebclientPlugin',
  'turnstile-api'
)

// Cloudflare's "always fails" visible test sitekey — the widget renders but
// never produces a passing token. See modules/CloudflareTurnstileWebclientPlugin/README.md
const ALWAYS_FAIL_SITEKEY = '2x00000000000000000000AB'

// Module.php Enums\ErrorCodes::CloudflareTurnstileVerificationError — "no
// token was submitted" (this is the code the desktop client hits: the
// classic Knockout login form does not check CTurnstileView's `Reject`
// flag before submitting — see js/views/CTurnstileView.js — so it POSTs
// the Login request anyway, with no CloudflareTurnstileWebclientPluginToken
// field, and the server rejects it).
const ERROR_CODE_VERIFICATION_DID_NOT_COMPLETE = 1002

test.describe('Cloudflare Turnstile — always-fail test sitekey blocks login', () => {
  test.skip(
    !hasCredentials(),
    'Set E2E_LOGIN_PRIMARY/E2E_PASSWORD_PRIMARY in .env.e2e'
  )

  test('server rejects the login with a Turnstile verification error', async ({
    page,
  }) => {
    test.setTimeout(T(90000))
    const { login, password } = getPrimaryCredentials()

    await step('Open login page — widget renders but can never pass', async () => {
      await page.context().clearCookies()
      await page.goto('')

      const settings = await getTurnstileSettings(page)
      test.skip(
        !settings ||
          !settings.ShowTurnstile ||
          settings.SiteKey !== ALWAYS_FAIL_SITEKEY,
        'Server config mismatch: expected the module enabled with the always-fail ' +
          `test sitekey (${ALWAYS_FAIL_SITEKEY}) and ShowTurnstile=true. ` +
          'See test/e2e/README.md "Server-side config per scenario" (Scenario B).'
      )

      // page.frames() (main frame + widget iframe) is more robust here than
      // a CSS-visibility check — see widget-and-login.spec.js for why.
      await expect
        .poll(() => page.frames().length, { timeout: T(15000) })
        .toBeGreaterThan(1)
    })

    let loginResponseBody = null

    await step('Fill real credentials and submit (no token was ever produced)', async () => {
      await fieldControl(page, sel('loginEmail')).fill(login)
      await fieldControl(page, sel('loginPassword')).fill(password)

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === 'POST' &&
            (res.request().postData() || '').includes('Method=Login'),
          { timeout: T(30000) }
        ),
        page.getByTestId(sel('loginSubmit')).click(),
      ])
      loginResponseBody = await response.json()
    })

    await step('Login is rejected with the Turnstile error code', async () => {
      expect(loginResponseBody.Result).toBe(false)
      const subError =
        loginResponseBody.SubscriptionsResult?.[
          'CloudflareTurnstileWebclientPlugin::onBeforeLogin'
        ]?.Error
      expect(
        subError?.Code,
        `expected the Turnstile module to reject the login; got: ${JSON.stringify(
          loginResponseBody
        )}`
      ).toBe(ERROR_CODE_VERIFICATION_DID_NOT_COMPLETE)
    })

    await step('UI stays on the login form', async () => {
      await expect(page.getByTestId(sel('loginEmail'))).toBeVisible({
        timeout: T(10000),
      })
    })

    await attachScreenshot(page, 'turnstile-always-fail-blocked')
  })
})
