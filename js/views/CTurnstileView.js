'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	
	Settings = require('modules/%ModuleName%/js/Settings.js')
;

/**
 * @param {string} sModuleName
 * @constructor
 */
function CTurnstileView(sModuleName)
{
	this.sModuleName = sModuleName
	this.widgetId = null
	this.$containerDom = ko.observable(null)

	App.subscribeEvent('AnonymousUserForm::PopulateFormSubmitParameters', _.bind(function (oData) {
		if (oData.Module === sModuleName && oData.Parameters) {
			var oParameters = this.getParametersForSubmit()
			if (oParameters) {
				_.extend(oData.Parameters, oParameters)
			} else {
				oData.Reject = true
			}
		}
	}, this))

	if (!window.turnstile) {
		$.getScript('https://challenges.cloudflare.com/turnstile/v0/api.js', _.bind(this.showTurnstile, this))
	} else {
		this.showTurnstile()
	}

	this.$containerDom.subscribe(function () {
		this.showTurnstile()
	}, this)
}

CTurnstileView.prototype.showTurnstile = function ()
{
	if (window.turnstile) {
		if (this.widgetId === null) {
			var
				sKey = Settings ? Settings.SiteKey : '',
				container = this.$containerDom()
			;

			if (container && container.length) {
				this.widgetId = window.turnstile.render(container[0], {
					sitekey: sKey,
					size: 'flexible'
				})
			}
		} else {
			window.turnstile.reset(this.widgetId)
		}
	}
}

CTurnstileView.prototype.getParametersForSubmit = function ()
{
	let mResult = {}

	if (window.turnstile) {
		const token = window.turnstile.getResponse(this.widgetId)
		
		if (token) {
			mResult[Settings.ModuleName + "Token"] = token
			window.turnstile.reset(this.widgetId)
			window.turnstile.execute(this.widgetId)
		} else {
			mResult = false
		}
	}

	return mResult
}

CTurnstileView.prototype.ViewTemplate = '%ModuleName%_MainView'

module.exports = CTurnstileView
