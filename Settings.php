<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CloudflareTurnstileWebclientPlugin;

use Aurora\System\SettingsProperty;

/**
 * @property bool $Disabled
 * @property string $SiteKey
 * @property string $SecretKey
 * @property array $WhitelistIPs
 * @property bool $IncludeInMobile
 * @property bool $IncludeInDesktop
 * @property string $SystemLogPath
 */

class Settings extends \Aurora\System\Module\Settings
{
    protected function initDefaults()
    {
        $this->aContainer = [
            "Disabled" => new SettingsProperty(
                false,
                "bool",
                null,
                "Setting to true disables the module",
            ),
            "SiteKey" => new SettingsProperty(
                "",
                "string",
                null,
                "Site key obtained at Cloudflare Turnstile website",
            ),
            "SecretKey" => new SettingsProperty(
                "",
                "string",
                null,
                "Secret key obtained at Cloudflare Turnstile website",
            ),
            "WhitelistIPs" => new SettingsProperty(
                [],
                "array",
                null,
                "List of IP addresses CAPTCHA is never be displayed for",
            ),
            "IncludeInMobile" => new SettingsProperty(
                true,
                "bool",
                null,
                "If true, the module is used in mobile version of the interface",
            ),
            "IncludeInDesktop" => new SettingsProperty(
                true,
                "bool",
                null,
                "If true, the module is used in desktop version of the interface",
            ),
            "SystemLogPath" => new SettingsProperty(
                "",
                "string",
                null,
                "Location of the system log file, if empty then Aurora logs are used",
            ),
        ];
    }
}
