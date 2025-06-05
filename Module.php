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
    protected $token = null;

    protected $allowCheckOnLogin = true;

    public function init()
    {
        // $this->aErrors = [
        //     Enums\ErrorCodes::RecaptchaVerificationError	=> $this->i18N('ERROR_RECAPTCHA_VERIFICATION_DID_NOT_COMPLETE'),
        //     Enums\ErrorCodes::RecaptchaUnknownError		=> $this->i18N('ERROR_UNKNOWN_RECAPTCHA_ERROR'),
        // ];

        \Aurora\System\EventEmitter::getInstance()->onAny(
            [
                ['MailLoginFormWebclient::Login::before', [$this, 'onBeforeMailLoginFormWebclientLogin']],
                ['StandardRegisterFormWebclient::Register::before', [$this, 'onBeforeStandardRegisterFormWebclientRegister']],
                ['StandardLoginFormWebclient::Login::before', [$this, 'onBeforeStandardLoginFormWebclient'], 90],
                ['MailSignup::Signup::before', [$this, 'onSignup'], 90],
                ['Core::Login::after', [$this, 'onAfterLogin']]
            ]
        );

        $this->subscribeEvent('AddToContentSecurityPolicyDefault', array($this, 'onAddToContentSecurityPolicyDefault'));
    }

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

    public function onAddToContentSecurityPolicyDefault($aArgs, &$aAddDefault)
    {
        $aAddDefault[] = 'www.google.com www.gstatic.com';
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
            'LimitCount' => $this->oModuleSettings->LimitCount,
            'ShowTurnstile' => $this->isTurnstileEnabledForIP(),
        ];
    }

    protected function isTurnstileEnabledForIP()
    {
        return !in_array(\Aurora\System\Utils::getClientIp(), $this->oModuleSettings->WhitelistIPs);
    }

    protected function memorizeToken($aArgs)
    {
        $tokenParamName = 'CloudflareTurnstileWebclientPluginToken';
        if (isset($aArgs[$tokenParamName]) && !empty($aArgs[$tokenParamName])) {
            $this->token = $aArgs[$tokenParamName];
        }
    }

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

    protected function checkIfTokenError()
    {
        if ($this->token === null) {
           $this->log('Turnstile error: no token');
            return [
                'Error' => [
                    'Code' => 'VerificationError',
                    'ModuleName' => $this->GetName(),
                    'Override' => true
                ]
            ];
        }

        $responseKeys = $this->validateToken($this->token);
        if (!$responseKeys["success"]) {
            $this->log('Turnstile error: ' . implode(', ', $responseKeys["error-codes"]));
            return [
                'Error' => [
                    'Code' => 'UnknownError',
                    'ModuleName' => $this->GetName(),
                    'Override' => true
                ]
            ];
        }

        return false;
    }

    protected function needToCheckTurnstileOnLogin()
    {
        if (!$this->allowCheckOnLogin) {
            return false;
        }

        if (!$this->isTurnstileEnabledForIP()) {
            return false;
        }

        $authErrorCount = isset($_COOKIE['auth-error']) ? (int) $_COOKIE['auth-error'] : 0;
        // If the user has exceeded the number of authentication attempts
        if ($authErrorCount >= $this->oModuleSettings->LimitCount) {
            return true;
        }

        return false;
    }

    protected function clearAuthErrorCount()
    {
        //If the user is authenticated, reset the counter for unsuccessful attempts.
        if (isset($_COOKIE['auth-error'])) {
            \Aurora\System\Api::setCookie(
                'auth-error',
                0,
                \strtotime('+1 hour'),
                false
            );
        }
    }

    protected function incrementAuthErrorCount()
    {
        $iAuthErrorCount = isset($_COOKIE['auth-error']) ? ((int) $_COOKIE['auth-error'] + 1) : 1;
        \Aurora\System\Api::setCookie(
            'auth-error',
            $iAuthErrorCount,
            \strtotime('+1 hour'),
            false
        );
    }

    protected function log($text)
    {
        if (!$this->oModuleSettings->SystemLogPath) {
            \Aurora\System\Api::Log($text);
        } else {
            error_log(sprintf("[%s] - %s\n", date(\DateTimeInterface::RFC3339), $text), 3, $this->oModuleSettings->SystemLogPath);
        }
    }

    public function onBeforeStandardRegisterFormWebclientRegister($aArgs, &$mResult, &$mSubscriptionResult)
    {
        if ($this->isTurnstileEnabledForIP()) {
            $this->memorizeToken($aArgs);

            $mSubscriptionResult = $this->checkIfTokenError();
            if (!empty($mSubscriptionResult)) {
                // The result contains an error -> stop executing the Register method
                return true;
            }

            $this->allowCheckOnLogin = false;
        }
    }

    public function onBeforeMailLoginFormWebclientLogin($aArgs, &$mResult, &$mSubscriptionResult)
    {
        $this->memorizeToken($aArgs);
    }

    public function onBeforeStandardLoginFormWebclient($aArgs, &$mResult, &$mSubscriptionResult)
    {
        if ($this->needToCheckTurnstileOnLogin()) {
            $this->memorizeToken($aArgs);

            $mSubscriptionResult = $this->checkIfTokenError();
            if (!empty($mSubscriptionResult)) {
                // The result contains an error -> stop executing the Login method
                return true;
            }

            $this->clearAuthErrorCount();
        }
    }

    public function onSignup($aArgs, &$mResult, &$mSubscriptionResult)
    {
        if ($this->isTurnstileEnabledForIP()) {
            $this->memorizeToken($aArgs);

            $mSubscriptionResult = $this->checkIfTokenError();
            if (!empty($mSubscriptionResult)) {
                // The result contains an error -> stop executing the Register method
                return true;
            }
        }
    }

    public function onAfterLogin($aArgs, &$mResult)
    {
        // if authentication has failed, increment auth-error counter
        if (!(is_array($mResult) && isset($mResult[\Aurora\System\Application::AUTH_TOKEN_KEY]))) {
            $this->incrementAuthErrorCount();
        }
    }
}
