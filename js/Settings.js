'use strict';

var
	_ = require('underscore'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	ModuleName: 'CloudflareTurnstileWebclientPlugin',
	SiteKey: '',
	ShowTurnstile: true,

	/**
	 * Initializes settings from AppData object sections.
	 * 
	 * @param {Object} oAppData Object contained modules settings.
	 */
	init: function (oAppData)
	{
		var oAppDataSection = oAppData[this.ModuleName] || {};
		
		if (!_.isEmpty(oAppDataSection))
		{
			this.SiteKey = Types.pString(oAppDataSection.SiteKey, this.SiteKey);
			this.ShowTurnstile = Types.pBool(oAppDataSection.ShowTurnstile, this.ShowTurnstile);
		}
	}
};
