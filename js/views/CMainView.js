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
 * @param {boolean} bUseLimitCount
 * @constructor
 */
function CMainView(sModuleName, bUseLimitCount)
{
	this.sModuleName = sModuleName;
	this.bShown = false;
	this.iAuthErrorCount = ko.observable(0);
	this.bShowTurnstile = ko.observable(true);

	if (bUseLimitCount) {
		this.iAuthErrorCount($.cookie('auth-error') || 0);
		this.iLimitCount = Settings ? Settings.LimitCount : 0;
		//If the user has exceeded the number of authentication attempts - turnstile will be shown 
		if (this.iAuthErrorCount() < this.iLimitCount) {
			this.bShowTurnstile(false);
		}
		App.subscribeEvent('ReceiveAjaxResponse::after', _.bind(function (oParams) {
			if ((oParams.Request.Module === 'StandardLoginFormWebclient' || oParams.Request.Module === 'MailLoginFormWebclient')
				&& oParams.Request.Method === 'Login'
				&& oParams.Response.Result === false) {
				//In case of unsuccessful authentication the counter of unsuccessful attempts will be updated.
				this.iAuthErrorCount($.cookie('auth-error') || 0);
				if (this.iAuthErrorCount() >= this.iLimitCount) {
					if (!this.bShowTurnstile()) {
						this.bShowTurnstile(true);
					}
				}
			}
		}, this));
	}

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
	}
	return oResult;
};

CMainView.prototype.ViewTemplate = '%ModuleName%_MainView';

module.exports = CMainView;
