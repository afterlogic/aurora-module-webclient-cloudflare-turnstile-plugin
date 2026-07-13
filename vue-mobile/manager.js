import _ from 'lodash'

import eventBus from 'src/event-bus'

import settings from './settings'
import turnstileApi from './turnstile-api'

const LOGIN_MODULE_NAME = 'StandardLoginFormMobileWebclient'

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
  if (params.Module !== LOGIN_MODULE_NAME || !params.Parameters) {
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
  if (params.ModuleName === LOGIN_MODULE_NAME) {
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
    eventBus.$off('StandardLoginFormMobileWebclient::GetBeforeButtonsComponents', _getBeforeButtonsComponents)
    eventBus.$on('StandardLoginFormMobileWebclient::GetBeforeButtonsComponents', _getBeforeButtonsComponents)

    eventBus.$off('AnonymousUserForm::PopulateFormSubmitParameters', _populateFormSubmitParameters)
    eventBus.$on('AnonymousUserForm::PopulateFormSubmitParameters', _populateFormSubmitParameters)

    eventBus.$off('AnonymousUserForm::LoginFailed', _onLoginFailed)
    eventBus.$on('AnonymousUserForm::LoginFailed', _onLoginFailed)
  },
}
