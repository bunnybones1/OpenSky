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
| `CACHE_INFO`        | `preserved-browser-diagnostic`         | Original browser/game cache overview, linked from the preserved footer and backed entirely by local browser storage.    |
| `SHOP`              | `unreleased-source-mock`               | Not mounted: its source data is explicitly `MOCK_SHOP_ITEMS`, its copy is placeholder lorem ipsum, and every offer button is wired to `noop`; there is no earning, purchase, or API behavior to retire. |
| `HERO_FEATURE`      | `preserved-offchain-controls`          | Original Hero page with Google Gold-card exchange.                                                                      |
| `SELECT_GOLDS`      | `preserved-offchain-controls`          | Original selection UI with identity-owned D1 exchange.                                                                  |
| `LEADERBOARD`       | `preserved-original-page`              | Original player and deck leaderboards.                                                                                  |
| `MARKET`            | `walletconnect-capability-placeholder` | Explicit original-product placeholder until optional WalletConnect trading is designed.                                 |
| `ITEMS`             | `preserved-identity-inventory`         | Original collection pages backed by D1; linked wallet contents are optional/read-only.                                  |
| `DECK_BUILDER`      | `preserved-original-page`              | Original deck editor.                                                                                                   |
| `QUESTS`            | `preserved-offchain-rewards`           | Original quest UI with D1 progress and claims.                                                                          |
| `CREATE_DECK`       | `preserved-original-page`              | Original creation flow.                                                                                                 |
| `ACCOUNT`           | `preserved-google-identity`            | Original profile shell backed by Google identity and optional linked wallets.                                           |
| `ADMIN`             | `preserved-identity-rbac`              | Original staff browser tree behind D1 `ADMIN`; child outlets cannot mount before role confirmation, and writes require separate capabilities. |
| `SANCTIONS_LIST`    | `superseded-wallet-era-policy-copy`    | The 2022 wallet/fiat policy copy is not presented as current Cloud Weasel policy.                                       |
| `DELETED_ACCOUNT`   | `preserved-original-page`              | Original deletion-complete destination.                                                                                 |

The Google app additionally mounts the source Invite Friends pages, which were
present in the repository and navigation but omitted from `LegacyApp` routing.
Unknown URLs render the original 404 page rather than silently redirecting to
Home. Google account deletion retains the source destination without reviving
the wallet transaction: the browser starts a same-origin Google re-verification
flow, the Worker records the deletion request in D1, clears the identity
session, and redirects to `/deleted-account`.

The hidden Shop prototype is not excluded because it mentions USDC or would
eventually have minted assets. It has no source fulfillment at all: hard-coded
mock offers expire relative to browser load, all sections repeat placeholder
copy, and the only action handler is `noop`. Promoting those values would invent
an economy rather than preserve shipped work. Any real offer later introduced
must use an approved catalog and receipt-backed off-chain fulfillment.

The original Cache Info page is wallet-independent and remains useful in the
Cloudflare build: Practice still loads the original game assets, the Home
widget offers the source browser-cache prefetch, and the preserved footer links
to this route. Google mode therefore mounts the unchanged cache overview and
render diagnostics rather than leaving that source navigation item pointed at
the 404 page. It reads browser storage and graphics capabilities only; it does
not create player or reward state.

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

The original global Deck Viewer is also mounted for Google identities. Deck
inspection, stats, ownership counts, favorite/edit/import controls, and the
SkyPass prism-unlock link use the identity-backed deck and inventory APIs. Its
legacy “Add missing to cart” action remains wallet-mode only, and Google mode
does not issue the absent banner query merely to calculate viewer spacing.

The source announcement banner strip is mounted in Google mode as well. Player
reads use the ported `GetBanners` contract, which exposes only currently active
D1 rows in source order. The original sanitized markup, external-link handling,
local dismissal, and responsive page offsets are preserved. The Deck Viewer
shares that global query result but cannot initiate a second banner request.

The original nested admin browser tree is mounted behind its server-backed D1
role probe. A loading barrier prevents any child outlet from issuing staff RPCs
until `ADMIN` is confirmed; non-admins redirect to the player app. The Worker
independently checks `staff_roles` on every staff read and requires separate,
dormant capability rows for content, moderation, progression, entitlement, and
other writes. Production currently has no staff roles or write capabilities.

App-shell milestone `3dd82f6` restored the original wallet-independent dialogs
in production. Follow-up milestone `f988b30` fixed the identity-policy owner
model discovered during live QA, and D1 migration `0092` plus Worker version
`65ae3065-c58e-42e0-9f31-c3972eaec1a2` were deployed on 2026-08-13. Production
verification found all six owner/policy/deletion triggers, no pending migration,
and exactly the two Google-mode controls in the original dialog. The check used
Cancel and left the signed-in user's consent unchanged.

Deck Viewer milestone `053e3df` was deployed on 2026-08-13 as Worker version
`7dddea06-6b87-4de6-8236-e41b2d1d7cf9`. Raw production HTML referenced the
verified local entry asset `index-5f942297.js`. A fresh signed-in browser client
opened the existing Ada Starter deck in the original viewer, rendered its card
list and Edit Deck control, and did not render the legacy “Add missing to cart”
action. Verification returned to the deck list without changing the deck. An
earlier upload raced the final asset build and retained the prior manifest; the
served entry hash is therefore an explicit rollout check, not inferred from a
successful Worker upload.

Announcement-banner milestone `904cdd6` was deployed on 2026-08-13 as Worker
version `c55b65e2-75ab-4ccf-a18b-3c6d4bfef3b5`. Production HTML referenced the
verified entry asset `index-315615a6.js`; the public `GetBanners` contract
returned the current empty active set, and a fresh signed-in Home client loaded
without an error or phantom banner. No production announcement was created for
verification; active rendering and the staff lifecycle remain covered by the
content/staff integration suites.

Admin-route milestone `6dba58a` was deployed on 2026-08-13 as Worker version
`1a8f1555-701b-47e9-8e3f-0d9dbdad6769`; production HTML referenced the tested
entry asset `index-511731f6.js`. Production had zero `ADMIN` roles and zero
content-write permissions. A fresh signed-in non-admin client requested
`/admin/users`, redirected to `/home`, rendered the player shell, and exposed no
admin navigation, staff data, or permission error. No role or capability was
created for verification.

Reward-visibility milestone `78cfd78` was deployed on 2026-08-13 as Worker
version `937e45ca-7cbd-43a3-ac84-bb60903a3aff`; production HTML referenced the
tested entry asset `index-ca3261df.js`. The release gate now binds all 12 active
former mint queues to an original player-visible claim, feed, notification,
pending-delivery, collection, or inventory surface. A fresh signed-in Home
client rendered the original navigation and content without a phantom reward
dialog. Verification was read-only and did not create, claim, or mark any
notification or reward.
