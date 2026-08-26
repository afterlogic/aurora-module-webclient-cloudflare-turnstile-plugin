import _ from 'lodash'

import eventBus from 'src/event-bus'

import settings from './settings'
import turnstileApi from './turnstile-api'

const LOGIN_MODULE_NAMES = [
  'StandardLoginFormMobileWebclient',
  'MailLoginFormMobileWebclient',
]

const _getBeforeButtonsComponents = (params) => {
  if (!settings.getSetting('showTurnstile') || !settings.getSetting('siteKey')) {
    return
  }

  if (!_.isArray(params.beforeButtonsComponents)) {
    params.beforeButtonsComponents = []
  }

  params.beforeButtonsComponents.push(() => import('./components/TurnstileWidget'))
}

const _populateFormSubmitParameters = (params) => {
  if (!LOGIN_MODULE_NAMES.includes(params.Module) || !params.Parameters) {
    return
  }

  if (!settings.getSetting('showTurnstile') || !settings.getSetting('siteKey')) {
    return
  }

  const tokenParameters = turnstileApi.getTokenParameters()
  if (tokenParameters) {
    _.extend(params.Parameters, tokenParameters)
  } else {
    params.Reject = true
  }
}

const _onLoginFailed = (params) => {
  if (LOGIN_MODULE_NAMES.includes(params.ModuleName)) {
    turnstileApi.reset()
  }
}

export default {
  moduleName: 'CloudflareTurnstileWebclientPlugin',

  requiredModules: [],

  init (appData) {
    settings.init(appData)
  },

  initSubscriptions () {
    LOGIN_MODULE_NAMES.forEach((moduleName) => {
      const eventName = `${moduleName}::GetBeforeButtonsComponents`
      eventBus.$off(eventName, _getBeforeButtonsComponents)
      eventBus.$on(eventName, _getBeforeButtonsComponents)
    })

    eventBus.$off('AnonymousUserForm::PopulateFormSubmitParameters', _populateFormSubmitParameters)
    eventBus.$on('AnonymousUserForm::PopulateFormSubmitParameters', _populateFormSubmitParameters)

    eventBus.$off('AnonymousUserForm::LoginFailed', _onLoginFailed)
    eventBus.$on('AnonymousUserForm::LoginFailed', _onLoginFailed)
  },
}
