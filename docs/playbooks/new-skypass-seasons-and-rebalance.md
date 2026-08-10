# New Skypass Seasons and Rebalance

Use this playbook for a season rollover that includes both Skypass reward changes and gameplay balance updates.

## Cadence

The historical cadence has been every 28 days. Treat that as a planning baseline, not as an automation guarantee.

## Coordination Checklist

1. Prepare season rewards with [New Skypass Seasons](../workflows/skypass.md).
2. Finalize balance and card changes in [Sky Sheets](../tools/skysheets/README.md).
3. Implement rules changes with the [Card Patch Workflow](../workflows/card-patch-workflow.md).
4. Generate and deploy required assets with [Asset Generation and Deployment](../workflows/asset-generation-and-deployment.md).
5. Validate the combined season and balance changes with the [QA checklist](../workflows/qa-checklist.md).
6. Draft release messaging with [Pretty Patch Notes](../tools/pretty-patch-notes.md).
7. Publish or schedule the related season communication through the current content workflow.
8. If release work diverged from `master`, complete the [Merge-Back Release to Master](../workflows/merge-back-release-to-master.md).

## Outputs

- new Skypass season data
- balance patch changes
- deployed assets and migrations where required
- public-facing season and patch communication
