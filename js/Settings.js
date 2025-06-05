'use strict';

var
	_ = require('underscore'),

	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	ModuleName: 'CloudflareTurnstileWebclientPlugin',
	SiteKey: '',
	LimitCount: 0,
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
			this.LimitCount = Types.pInt(oAppDataSection.LimitCount, this.LimitCount);
			this.ShowTurnstile = Types.pBool(oAppDataSection.ShowTurnstile, this.ShowTurnstile);
		}
	}
};
