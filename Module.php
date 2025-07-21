<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\CloudflareTurnstileWebclientPlugin;

/**
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2023, Afterlogic Corp.
 *
 * @property Settings $oModuleSettings
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractModule
{
    public $tokenName = 'CloudflareTurnstileWebclientPluginToken';

    protected $checkSuccessful = false;

    protected $allowCheckOnLogin = true;

    protected $allowCheckOnRegister = true;

    /**
     * @return Module
     */
    public static function getInstance()
    {
        return parent::getInstance();
    }

    /**
     * @return Module
     */
    public static function Decorator()
    {
        return parent::Decorator();
    }

    /**
     * @return Settings
     */
    public function getModuleSettings()
    {
        return $this->oModuleSettings;
    }

    public function init()
    {
        $this->aErrors = [
            Enums\ErrorCodes::CloudflareTurnstileVerificationError	=> $this->i18N('ERROR_CLOUDFARE_TURNSTILE_VERIFICATION_DID_NOT_COMPLETE'),
            Enums\ErrorCodes::CloudflareTurnstileUnknownError		=> $this->i18N('ERROR_UNKNOWN_CLOUDFARE_TURNSTILE_ERROR'),
        ];

        if (!empty($this->oModuleSettings->SecretKey) && !empty($this->oModuleSettings->SiteKey)) {

            \Aurora\System\EventEmitter::getInstance()->onAny(
                [
                    ['Register::before', [$this, 'onBeforeRegister']],
                    ['Signup::before', [$this, 'onBeforeRegister']],
                    ['Login::before', [$this, 'onBeforeLogin']],
                ]
            );

            $this->subscribeEvent('AddToContentSecurityPolicyDefault', array($this, 'onAddToContentSecurityPolicyDefault'));
        }
    }

    public function onAddToContentSecurityPolicyDefault($aArgs, &$aAddDefault)
    {
        $aAddDefault[] = 'challenges.cloudflare.com';
    }

    /**
     * Obtains list of module settings for authenticated user.
     * @return array
     */
    public function GetSettings()
    {
        \Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::Anonymous);

        return [
            'SiteKey' => $this->oModuleSettings->SiteKey,
            'ShowTurnstile' => $this->isTurnstileEnabledForIP(),
        ];
    }

    protected function isTurnstileEnabledForIP()
    {
        $ClientIP = \Aurora\System\Utils::getClientIp();
        $IPwhitelisted = false;
        foreach ($this->oModuleSettings->WhitelistIPs as $WhitelistIP) {
            if ($this->cidr_match($ClientIP, $WhitelistIP)) {
                $IPwhitelisted = true;
                break;
            }
        }
        return !$IPwhitelisted;
    }

    /**
     * Validates token on Cloudflare Turnstile service.
     *
     * @param string $token
     * @return array{success: bool, 'error-codes': array<string>} The response from the Turnstile service.
     */
    protected function validateToken($token)
    {
        $ch = curl_init("https://challenges.cloudflare.com/turnstile/v0/siteverify");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, [
            'secret' => $this->oModuleSettings->SecretKey,
            'response' => $token
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    /**
     * Checks if the token exists and if the check has already been performed.
     *
     * @param array $aArgs
     * @return mixed false | array{Error: array{Code: int, ModuleName: string, Override: bool}|bool}
     */
    protected function checkIfTokenError($aArgs)
    {
        if (!$this->checkSuccessful) {
            $login = isset($aArgs['Login']) ? $aArgs['Login'] : '';

            if (empty($this->oModuleSettings->SecretKey)) {
                $this->log('Turnstile error: not configured');
                return [
                    'Error' => [
                        'Code' => Enums\ErrorCodes::CloudflareTurnstileVerificationError,
                        'ModuleName' => $this->GetName(),
                        'Override' => true
                    ]
                ];
            }

            $token = null;
            if (isset($aArgs[$this->tokenName]) && !empty($aArgs[$this->tokenName])) {
                $token = $aArgs[$this->tokenName];
            }

            if ($token === null) {
                $this->log('Turnstile error: no token - ' . $login);
                return [
                    'Error' => [
                        'Code' => Enums\ErrorCodes::CloudflareTurnstileVerificationError,
                        'ModuleName' => $this->GetName(),
                        'Override' => true
                    ]
                ];
            }

            $responseKeys = $this->validateToken($token);

            if ($responseKeys["success"]) {
                $this->checkSuccessful = true;
            } else {
                $this->log('Turnstile error: ' . implode(', ', $responseKeys["error-codes"]) . ' - ' . $login);
                return [
                    'Error' => [
                        'Code' => Enums\ErrorCodes::CloudflareTurnstileUnknownError,
                        'ModuleName' => $this->GetName(),
                        'Override' => true
                    ]
                ];
            }
        }

        return false;
    }

    protected function needToCheckOnLogin()
    {
        if (!$this->allowCheckOnLogin) {
            return false;
        }

        if (!$this->isTurnstileEnabledForIP()) {
            return false;
        }

        return true;
    }

    protected function needToCheckOnRegister()
    {
        if (!$this->allowCheckOnRegister) {
            return false;
        }

        if (!$this->isTurnstileEnabledForIP()) {
            return false;
        }

        return true;
    }

    protected function log($text)
    {
        if (!$this->oModuleSettings->SystemLogPath) {
            \Aurora\System\Api::Log($text);
        } else {
            error_log(sprintf("[%s] - %s\n", date(\DateTimeInterface::RFC3339), $text), 3, $this->oModuleSettings->SystemLogPath);
        }
    }

    public function onBeforeLogin($aArgs, &$mResult, &$mSubscriptionResult)
    {
        if ($this->needToCheckOnLogin()) {

            $mSubscriptionResult = $this->checkIfTokenError($aArgs);
            if (!empty($mSubscriptionResult)) {
                // The result contains an error -> stop executing the Login method
                return true;
            }
        }
    }

    public function onBeforeRegister($aArgs, &$mResult, &$mSubscriptionResult)
    {
        if ($this->needToCheckOnRegister()) {

            $mSubscriptionResult = $this->checkIfTokenError($aArgs);
            if (!empty($mSubscriptionResult)) {
                // The result contains an error -> stop executing the Register method
                return true;
            }
        }
    }

    protected function cidr_match($ip, $range)
    {
        list ($subnet, $bits) = explode('/', $range);
        if ($bits === null) {
            $bits = 32;
        }
        $ip = ip2long($ip);
        $subnet = ip2long($subnet);
        $mask = -1 << (32 - $bits);
        $subnet &= $mask;
        return ($ip & $mask) == $subnet;
    }
}
