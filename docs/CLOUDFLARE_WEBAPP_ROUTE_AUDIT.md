# Cloudflare webapp route fidelity audit

Cloud Weasel adapts the original product rather than replacing it. Every route
mounted by the source `LegacyApp` therefore has an explicit Google-identity
disposition below. `pnpm check:cloudflare:webapp-routes` fails when the source
adds or removes a route, when a reviewed Google mount changes, or when the
original 404/deleted-account destinations disappear.

| Source route        | Disposition                            | Google identity behavior                                                                                                |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `SECRET_DEBUG`      | `legacy-diagnostic`                    | Not mounted; the wallet/debug surface requires a separate review.                                                       |
| `HOME`              | `preserved-original-page`              | Original Home page.                                                                                                     |
| `PLAYGROUND`        | `local-development-only`               | Source itself mounts this only on localhost.                                                                            |
| `PLAY`              | `preserved-original-page`              | Original Play page with deployment-gated modes.                                                                         |
| `PURCHASE_CONQUEST` | `offchain-exchange-substitution`       | Redirects to the original Silver-card selection flow with D1 exchange controls; paid Conquest remains gated.            |
| `PENDING_GOLDS`     | `preserved-offchain-copy`              | Original delivery page with mint language replaced.                                                                     |
| `SELECT_SILVERS`    | `preserved-offchain-controls`          | Original selection UI with identity-owned D1 exchange.                                                                  |
| `SKY_PASS`          | `preserved-offchain-rewards`           | Original free and premium tracks backed by active D1 reward policy.                                                     |
| `SKY_PASS_PURCHASE` | `preserved-identity-commerce`          | Original page/artwork with Google-only Stripe controls and exact off-chain fulfillment.                                 |
| `CACHE_INFO`        | `legacy-diagnostic`                    | Not mounted; internal cache diagnostics are not a player surface.                                                       |
| `SHOP`              | `legacy-secret-shop`                   | Source-secret feature remains unadvertised pending product and reward review.                                           |
| `HERO_FEATURE`      | `preserved-offchain-controls`          | Original Hero page with Google Gold-card exchange.                                                                      |
| `SELECT_GOLDS`      | `preserved-offchain-controls`          | Original selection UI with identity-owned D1 exchange.                                                                  |
| `LEADERBOARD`       | `preserved-original-page`              | Original player and deck leaderboards.                                                                                  |
| `MARKET`            | `walletconnect-capability-placeholder` | Explicit original-product placeholder until optional WalletConnect trading is designed.                                 |
| `ITEMS`             | `preserved-identity-inventory`         | Original collection pages backed by D1; linked wallet contents are optional/read-only.                                  |
| `DECK_BUILDER`      | `preserved-original-page`              | Original deck editor.                                                                                                   |
| `QUESTS`            | `preserved-offchain-rewards`           | Original quest UI with D1 progress and claims.                                                                          |
| `CREATE_DECK`       | `preserved-original-page`              | Original creation flow.                                                                                                 |
| `ACCOUNT`           | `preserved-google-identity`            | Original profile shell backed by Google identity and optional linked wallets.                                           |
| `ADMIN`             | `operator-ui-review-pending`           | Backend staff contracts are ported; the wallet-era admin browser tree remains unmounted pending an identity/role audit. |
| `SANCTIONS_LIST`    | `superseded-wallet-era-policy-copy`    | The 2022 wallet/fiat policy copy is not presented as current Cloud Weasel policy.                                       |
| `DELETED_ACCOUNT`   | `preserved-original-page`              | Original deletion-complete destination.                                                                                 |

The Google app additionally mounts the source Invite Friends pages, which were
present in the repository and navigation but omitted from `LegacyApp` routing.
Unknown URLs render the original 404 page rather than silently redirecting to
Home. Google account deletion retains the source destination without reviving
the wallet transaction: the browser starts a same-origin Google re-verification
flow, the Worker records the deletion request in D1, clears the identity
session, and redirects to `/deleted-account`.

## Production rollout

Milestone `4866602` was deployed on 2026-08-13 as Worker version
`510a07db-8c30-4a60-9fd2-b7258a7ed935`. Signed-in browser verification at the
production URL confirmed that an unknown route renders the original “Edge of
the Sky” 404 page and `/deleted-account` renders the original account-deleted
page. The verification visited only those read-only destinations and did not
request account deletion.

## App-shell fidelity

The Google-identity app mounts the original wallet-independent shell behavior:
global error reporting, cookie settings, offline recovery, page-offset updates,
account analytics, product-tour hooks, and route view tracking. Cloudflare's
production configuration leaves analytics and Userpilot disabled until Cloud
Weasel-owned integrations are configured. Sequence signature confirmation,
burner-to-wallet conversion, and burner-account renaming remain exclusive to
the legacy-wallet app and cannot mount in Google mode.

Google-mode cookie controls preserve the source dialog and consent mechanics,
but expose only essential authentication/session storage and optional Cloud
Weasel product analytics. Geo-blocking, Marketplace, and Sequence cookie-policy
claims are legacy-wallet content and cannot be stored for an identity principal.
The D1 schema accepts policies owned by either an identity user or a legacy
wallet account, validates the smaller identity policy, and removes each policy
when its owning principal is deleted.

App-shell milestone `3dd82f6` restored the original wallet-independent dialogs
in production. Follow-up milestone `f988b30` fixed the identity-policy owner
model discovered during live QA, and D1 migration `0092` plus Worker version
`65ae3065-c58e-42e0-9f31-c3972eaec1a2` were deployed on 2026-08-13. Production
verification found all six owner/policy/deletion triggers, no pending migration,
and exactly the two Google-mode controls in the original dialog. The check used
Cancel and left the signed-in user's consent unchanged.
