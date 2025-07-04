'use strict';

module.exports = function (oAppData) {
	var
		_ = require('underscore'),
		
		App = require('%PathToCoreWebclientModule%/js/App.js'),
		
		Settings = require('modules/%ModuleName%/js/Settings.js')
	;

	Settings.init(oAppData);

	if (App.getUserRole() === Enums.UserRole.Anonymous)
	{
		return {
			start: function (ModulesManager)
			{
				if (Settings.ShowTurnstile)
				{
					var CMainView = require('modules/%ModuleName%/js/views/CMainView.js');
					App.subscribeEvent('AnonymousUserForm::PopulateBeforeButtonsControllers', _.bind(function (oParams) {
						if (_.isFunction(oParams.RegisterBeforeButtonsController))
						{
							const usingLimitCountModules = ['StandardLoginFormWebclient', 'MailLoginFormWebclient'];
							oParams.RegisterBeforeButtonsController(new CMainView(
								oParams.ModuleName,
								usingLimitCountModules.includes(oParams.ModuleName)
							));
						}
					}, this));
				}
			}
		};
	}
	return null;
};
