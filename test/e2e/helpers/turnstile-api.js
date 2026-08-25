/**
 * Reads the live server-side state of the CloudflareTurnstileWebclientPlugin
 * module from the desktop bootstrap payload the current page already
 * loaded, used to confirm the config each spec's describe() block expects
 * before asserting on it — see test/e2e/README.md "Server-side config per
 * scenario". Specs skip with a clear message on a mismatch instead of
 * failing confusingly against whatever config happens to be live.
 *
 * Desktop inlines the bootstrap payload into the page as
 * `window.auroraAppData` before app.js runs (see login.js
 * isTurnstileModuleActive for the same pattern) — reading it directly is
 * simpler and more faithful than a side-channel `?/Api/` call: it is
 * exactly what the real page already saw. Call after page.goto('').
 */

const MODULE_NAME = 'CloudflareTurnstileWebclientPlugin'

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{SiteKey: string, ShowTurnstile: boolean} | null>}
 *   null when the module is fully disabled (Settings.Disabled = true) or
 *   not otherwise present in the bootstrap payload.
 */
async function getTurnstileSettings(page) {
  return page.evaluate((moduleName) => {
    const data = window.auroraAppData
    return (data && data[moduleName]) || null
  }, MODULE_NAME)
}

module.exports = {
  MODULE_NAME,
  getTurnstileSettings,
}
