# Cloudflare moderation-score boundary

The staff report queue exposes a numeric `score` only because the preserved
OpenSky RPC schema requires that field. In Cloud Weasel it is an explicitly
neutral compatibility value, not a fraud probability. Individual report and
summary scores remain exactly zero until a complete replacement model is
reviewed and deployed.

Copying the final coefficients from
`30000000000115_update_scores.sql` would not be a faithful port. The source
calculation uses population-wide normalization and includes two inputs that do
not currently have equivalent Cloudflare contracts:

- `user faked bot matches` is recorded when an authenticated player calls the
  source bot-match endpoint for a non-tutorial mode. Cloud Weasel accepts only
  tutorial bot reports and rejects every other mode before persistence.
- `user_agent used by bots` is derived from complete user-agent history and a
  materialized population view that requires at least five accounts per user
  agent. Cloud Weasel does not collect that account-linkage history merely to
  reproduce a legacy classifier.

Most other features could be reconstructed from D1 match, deck, inventory,
report, and sanction ledgers. Calculating only those features would still
change the meaning of both the normalization and the trained intercept, so a
partial result must not be presented as the source score.

A future scoring milestone must define a Cloud Weasel-native purpose and
privacy contract, version every feature and coefficient, establish a minimum
population, store immutable calculation evidence, test replay and normalization
behavior, and label its output separately from the legacy probability. Until
then moderators use the underlying report and sanction evidence directly.
