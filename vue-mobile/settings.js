import types from 'src/utils/types'

class TurnstileSettings {
  constructor (appData) {
    const turnstileData = types.pObject(appData.CloudflareTurnstileWebclientPlugin)
    this.moduleName = 'CloudflareTurnstileWebclientPlugin'
    this.siteKey = types.pString(turnstileData.SiteKey, '')
    this.showTurnstile = types.pBool(turnstileData.ShowTurnstile, false)
  }
}

let settings = null

export default {
  init (appData) {
    settings = new TurnstileSettings(appData)
  },

  getSetting (settingName) {
    return settings ? settings[settingName] : null
  },
}
