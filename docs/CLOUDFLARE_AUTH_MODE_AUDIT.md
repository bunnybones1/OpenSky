# Cloud Weasel identity divergence audit

The Cloudflare browser preserves the original OpenSky interface and changes
only the authority needed for Google identity, off-chain inventory, optional
wallet observation, or a deliberately unavailable wallet transaction. The
build-time audit in `utils/audit-cloudflare-auth-mode.mjs` freezes every source
file and reference that branches on `AUTH_MODE`; a new branch cannot ship until
its product behavior is reviewed.

The reviewed inventory contains 65 files and 107 references. Its dispositions
cover identity authentication/session adapters, off-chain reward and exchange
copy, D1 inventory projections, wallet-market capability guards, cookie policy,
match certification, and runtime configuration. No disposition permits a
source-earned reward to disappear merely because its old fulfillment minted.

This audit restored three original wallet-free behaviors that had been adapted
too aggressively:

- Items again opens the original Decks library and retains its new-item count.
- Play again uses tutorial completion, stored game mode, and player level to
  choose the original destination instead of always opening Practice Bot.
- The nav profile and Account page again show card and Conquest-ticket balances,
  now through identity-native D1 inventory panels with no Sequence window,
  USDC value, market price, transaction signing, or blockchain copy.

Conquest V2 is intentionally not rendered through its legacy cash-shaped feed
event. The Cloudflare API converts its immutable reward receipt to the existing
generic card `REWARD` contract, so the original feed shows the delivered Silver
cards without inventing a USDC value. Its separate notification similarly
shows the card delivery and suppresses only the obsolete cash pane.

SkyPass detail cards keep the original reward art and off-chain descriptions.
Only the artwork badges whose literal promise is “mint reward” are absent in
Google mode. Every underlying card back, sticker, Silver card, ticket, point,
title, hero, and base-card claim is still represented by the versioned D1
SkyPass policy and immutable grant receipt.
