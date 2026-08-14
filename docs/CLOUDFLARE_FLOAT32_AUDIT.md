# Cloudflare float32 wire-contract audit

OpenSky's RIDL `float32` fields are observable JSON contracts. Go's JSON
encoder emits the shortest decimal that round-trips to the same 32-bit float,
whereas JavaScript can expose a binary64 expansion after `Math.fround`. The
Cloudflare port therefore reviews these fields separately from method-level RPC
coverage.

`pnpm check:cloudflare:float32` parses message fields directly from
`api/proto/api.ridl`, compares them with the checked-in review inventory, and
checks implementation or product-decision evidence. It fails when a source
field is added or removed without review, or when an evidence token disappears.
The complete production build runs this gate immediately after the RPC audit.

Service-method arguments are outside this inventory because they are not RIDL
message fields. They remain covered by their owning RPC implementation and
validation tests; for example, the Conquest V2 configuration arguments are
validated and normalized by the same repository that returns
`ConquestV2PoolConfigData`.

## Reviewed inventory

| Disposition                                              | Source fields                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-faithful JSON boundary                            | `AccountStat.winRatio`, `AccountStat.rankProgress`, `DeckRank.winRatio`, `DeckRank.gamesPlayed`, both `ConquestStats` win rates, all three `ConquestV2PoolConfigData` weights, `ConquestV2TreasureLevelSummary.totalWeight`, `ConquestV2Summary.totalWeight`, `ConquestV2Summary.weightUnitPrice` |
| Off-chain reward replaces cash field                     | `FeedEvent.conquestV2Reward`, `ConquestV2Pool.totalWeight`, `NotificationConquestV2Reward.amountUSDC`                                                                                                                                                                                             |
| Neutral compatibility value                              | `AccountSignal.score`                                                                                                                                                                                                                                                                             |
| Superseded legacy IAP request                            | `IAPPurchaseRequest.totalPrice`, `IAPPurchaseRequest.pricePerUnit`                                                                                                                                                                                                                                |
| Store-provider authority                                 | `GooglePlayPaymentResponse.totalPrice`, `AppleAppStorePaymentResponse.totalPrice`, `SamsungGalaxyStorePaymentResponse.itemPrice`                                                                                                                                                                  |
| Verified payment ledger replaces observational analytics | `AnalyticsItemPurchase.pricePerUnit`, `AnalyticsItemPurchase.totalPrice`                                                                                                                                                                                                                          |

The three store-provider fields do not share the same trust rule. Google client
price is not fulfillment authority; the Android Publisher purchase is. Apple
client price must match the signed transaction's integer milliunit price.
Samsung client item price is ignored in favor of the production receipt's
payment amount. In every case the immutable verified-payment receipt, not a
client-supplied float, is the off-chain inventory authority.

The review inventory and evidence paths live in
`utils/audit-cloudflare-float32.mjs`. Updating a disposition requires updating
that inventory, its tests, and this policy description in the same milestone.
