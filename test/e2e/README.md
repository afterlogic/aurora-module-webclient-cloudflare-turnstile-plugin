# CloudflareTurnstileWebclientPlugin — Desktop E2E

Desktop-only (classic Knockout UI) end-to-end tests for the Turnstile login-form plugin. Follows the shared harness — see `modules/CoreWebclient/test/e2e/README.md` for setup, `.env.e2e`, and how to run.

Uses Cloudflare's public test sitekeys/secrets (safe on any domain, never call the real Cloudflare API in a way that costs anything or needs a real account) — see `modules/CloudflareTurnstileWebclientPlugin/README.md`.

## Server-side config per scenario

Unlike other modules' specs, these tests can't fully self-provision their precondition: the module's behavior depends on **server-side settings** (`data/settings/modules/CloudflareTurnstileWebclientPlugin.config.json` on the Aurora install), and mutating that shared, live config from an automated per-test hook is unsafe on a staging box other people may be using at the same time. So each spec **reads the live config** (via the desktop bootstrap payload, `window.auroraAppData`) as its first step and calls `test.skip(...)` with a descriptive message if it doesn't match — instead of failing confusingly.

To actually exercise a scenario, set the module config on the server first (edit the JSON file directly, e.g. over SSH, then it takes effect immediately — no cache to clear), then run that scenario's spec file.

| Scenario | Spec file | `Disabled` | `SiteKey` | `SecretKey` | `WhitelistIPs` |
|---|---|---|---|---|---|
| A — happy path | `widget-and-login.spec.js` | `false` | `1x00000000000000000000AA` (always-pass) | `1x0000000000000000000000000000000AA` | `[]` |
| B — widget can't pass | `always-fail-sitekey.spec.js` | `false` | `2x00000000000000000000AB` (always-fail) | any test secret | `[]` |
| C — module fully off | `disabled-module.spec.js` | `true` | *(irrelevant)* | *(irrelevant)* | *(irrelevant)* |
| E — IP whitelisted | `whitelist-ip.spec.js` | `false` | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` | `["<runner's outbound IP>/32"]` |

Only `SiteKey`/`Disabled`/`WhitelistIPs` vary between A/B/E; `SecretKey` can stay on the always-pass test secret throughout (B never lets a token reach the server at all, so the secret is never actually checked there). `IncludeInDesktop`/`IncludeInMobile` are deployment-time configuration flags, not something these scenarios exercise — none of them change it.

For Scenario E, `WhitelistIPs` must contain the IP the Playwright *runner machine* is seen as by the server (`curl https://ifconfig.me` from that machine), not a developer's own IP.

### Running a scenario

The shared `StandardLoginFormWebclient setup` project (used by every other module's tests, via Playwright `dependencies`) logs in once per browser and caches the session. **Scenario B deliberately makes login impossible** — if the config is already switched to B when that setup project runs, it fails, and dependent projects are reported as "did not run" rather than skipped.

Run it with `--no-deps` so Playwright reuses whatever `.auth/<Browser>.json` storageState already exists on disk from a prior successful run (harmless — every spec here calls `page.context().clearCookies()` as its first step anyway):

```bash
# from modules/CoreWebclient
npx playwright test --config=test/e2e/playwright.config.js \
  --project="CloudflareTurnstileWebclientPlugin · Chrome" --no-deps \
  always-fail-sitekey.spec.js
```

A/C/E don't need `--no-deps` (login keeps working), but it's harmless to always use it once `.auth/Chrome.json` exists from any earlier successful run:

```bash
npx playwright test --config=test/e2e/playwright.config.js \
  --project="CloudflareTurnstileWebclientPlugin · Chrome" --no-deps \
  widget-and-login.spec.js
```

The `--setup "CloudflareTurnstileWebclientPlugin Chrome"` wrapper (`npm run test:e2e-desktop --`) works too for A/C/E, but on Windows/git-bash quoting the multi-word `--project` value it produces can get mangled — invoking `playwright test` directly (as above) is more reliable for this module.

## What's covered

- **Scenario A** — widget renders (a Turnstile iframe mounts; `page.frames().length` goes from 1 to 2), auto-passes with the always-pass test sitekey, and login completes normally.
- **Scenario B** — with the always-fail test sitekey the widget still renders but can never produce a token; the classic desktop login form (`StandardLoginFormWebclient/js/views/LoginView.js`) submits anyway (see finding below), and the server rejects the login with `ErrorCode 1002` (`CloudflareTurnstileVerificationError`) while the UI stays on the login form.
- **Scenario C** — `Disabled: true` removes the module from the Aurora module manager entirely: no widget, no server-side enforcement, login works exactly as if the plugin weren't installed. Control/baseline for A/B.
- **Scenario E** — `WhitelistIPs` correctly exempts a matching client IP: no widget, `GetSettings` reports `ShowTurnstile: false`, and login succeeds without a token.

Not covered (see **Open questions**, logged for follow-up rather than blocking this pass): registration/signup flow (`onBeforeRegister`), the mobile webclient (`IncludeInMobile` / `vue-mobile`), and the admin-login bypass (`isAdminLogin`). `IncludeInDesktop`/`IncludeInMobile` are deployment-time configuration flags rather than something a scenario is expected to flip, so they're deliberately not exercised here either.

## Open item: is `Reject` dead code on desktop by design?

`CTurnstileView.js` sets `oData.Reject = true` when no token is available (`getParametersForSubmit()` returns `false`), presumably meaning "don't submit." But the classic desktop `LoginView.js::signIn()` broadcasts `AnonymousUserForm::PopulateFormSubmitParameters` and then unconditionally calls `Ajax.send(...)` right after — it never reads `oData.Reject`. `RecaptchaWebclientPlugin`'s equivalent view doesn't set any `Reject` flag either, confirming this is the existing pattern for desktop, not a Turnstile-specific regression. Net effect (matches Scenario B as tested): on desktop, the "block submission until you solve the captcha" behavior is enforced **only server-side**, after a real round-trip — the client always attempts to submit.

Filed as **Outsource > Aurora Products > 9.8.7**: "CloudflareTurnstileWebclientPlugin: confirm whether the desktop login form should honor `Reject` client-side" — to determine whether this is intentional (desktop enforces server-side only, by design) or an oversight where the desktop login form should also honor it client-side before submitting.

## Open questions (not blocking — logged for follow-up)

1. **Registration flow** (`onBeforeRegister` / the `Register`/`Signup` event hooks) wasn't tested — it needs a signup-capable module enabled on the test instance and a disposable account to register (and clean up afterward). Wanted to confirm it's fine to create/delete a throwaway account on `oo.afterlogic.com/aurora-dev` for this before doing it.
2. **Mobile** (`IncludeInMobile`, `vue-mobile`) was explicitly out of scope per the task.

## Server config was restored

The server-side config on `oo.afterlogic.com/aurora-dev` was returned to the state it was found in after this pass: `Disabled: true`, `SiteKey`/`SecretKey` = the always-pass test pair, `WhitelistIPs: []`, `IncludeInDesktop`/`IncludeInMobile: true`. `.auth/*.json` storageState files were regenerated by real login runs during this pass (harmless, same mechanism any other spec run already uses).
