# aurora-module-webclient-cloudflare-turnstile-plugin

# Development
This repository has a pre-commit hook. To make it work you need to configure git to use the particular hooks folder.

`git config --local core.hooksPath .githooks/`

## Cloudflare's test sitekeys

Cloudflare provides a list of special sitekeys that can be used in localhost and not requires site registration

[developers.cloudflare.com/turnstile/troubleshooting/testing/](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

### Test sitekeys

| Sitekey | Behavior | Widget Type | Use case |
| ------- | -------- | ----------- | -------- |
| `1x00000000000000000000AA` | Always passes | Visible | Test successful form submissions |
| `2x00000000000000000000AB` | Always fails | Visible | Test error handling and retry logic |
| `1x00000000000000000000BB` | Always passes | Invisible | Test invisible widget success flows |
| `2x00000000000000000000BB` | Always fails | Invisible | Test invisible widget error handling |
| `3x00000000000000000000FF` | Forces interactive challenge | Visible | Test user interaction scenarios |

### Test secret keys

Use these secret keys for server-side validation testing:

| Secret key | Behavior | Use case |
| ---------- | -------- | -------- |
| `1x0000000000000000000000000000000AA` | Always passes validation | Test successful token validation |
| `2x0000000000000000000000000000000AA` | Always fails validation | Test validation error handling |
| `3x0000000000000000000000000000000AA` | Returns "token already spent" error | Test duplicate token handling |

### Local development

Test keys work on any domain, including:

- `localhost`
- `127.0.0.1`
- `0.0.0.0`
- Any development domain

# License
This module is licensed under AGPLv3 license if free version of the product is used or Afterlogic Software License if commercial version of the product was purchased.
