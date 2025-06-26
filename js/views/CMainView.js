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
function CMainView(sModuleName)
{
	this.sModuleName = sModuleName;
	this.bShown = false;

	App.subscribeEvent('AnonymousUserForm::PopulateFormSubmitParameters', _.bind(function (oParams) {
		if (oParams.Module === sModuleName && oParams.Parameters) {
			var aParams = this.getParametersForSubmit();
			_.extend(oParams.Parameters, aParams);
		}
	}, this));

	if (!window.turnstile) {
		$.getScript('https://challenges.cloudflare.com/turnstile/v0/api.js', this.showTurnstile);
	} else {
		this.showTurnstile();
	}
}

CMainView.prototype.showTurnstile = function ()
{
	if (window.turnstile) {
		if (!this.bShown) {
			var
				sKey = Settings ? Settings.SiteKey : '',
				container = $("#turnstile-container")
			;

			if (sKey === '') {
				sKey = "wrong-key";
			}

			if (container.length) {
				this.widgetId = window.turnstile.render(container.get(0), {
					sitekey: sKey,
					size: 'flexible'
				});
			}
		} else {
			window.turnstile.reset(this.widgetId);
		}
		this.bShown = true;
	}
};

CMainView.prototype.getParametersForSubmit = function ()
{
	var
		oResult = {}
	;

	if (window.turnstile) {
		oResult[Settings.ModuleName + "Token"] = window.turnstile.getResponse(this.widgetId);
		window.turnstile.reset(this.widgetId);
	}
	return oResult;
};

CMainView.prototype.ViewTemplate = '%ModuleName%_MainView';

module.exports = CMainView;
