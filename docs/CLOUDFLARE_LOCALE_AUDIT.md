# Cloud Weasel locale fidelity audit

The original webapp declares six supported languages: English, Spanish,
French, Brazilian Portuguese, Chinese, and Pig Latin. i18next falls back to
English when a locale resource is missing a key. That behavior previously made
the Cloud Weasel Google-auth, optional-wallet, and off-chain reward paths show
English copy inside non-English interfaces.

`utils/audit-cloudflare-locales.mjs` now makes that silent fallback a release
failure for the adapted product surface. It reviews 70 strings across all six
supported locales and verifies that:

- every locale has a non-empty translation;
- interpolation variables such as `{{ count }}` are preserved exactly;
- inline component markup such as `<white>` and `<span>` is preserved exactly;
- the `Cloud Weasel` product name is not translated or dropped; and
- new identity, optional-wallet, or `Offchain` locale keys cannot ship until
  they are added to the reviewed contract and translated everywhere.

The gate is part of `pnpm build:cloudflare` as
`pnpm check:cloudflare:locales`. It covers disabled development languages as
well as the production-enabled languages so that turning a language back on
cannot expose untranslated authentication or reward semantics.

These translations change only the adapted copy in the preserved OpenSky
interface. They do not alter routes, component hierarchy, visual design,
reward quantities, or fulfillment behavior.
