# Balance Patches

Use this playbook when a release changes card balance without rolling a new Skypass season.

## Scope

Balance patches normally start from `release` because they are production-bound changes.

## Coordination Checklist

1. Finalize the intended balance changes in [Sky Sheets](../tools/skysheets/README.md).
2. Implement required rules changes with the [Card Patch Workflow](../workflows/card-patch-workflow.md).
3. Generate and publish any affected assets with [Asset Generation and Deployment](../workflows/asset-generation-and-deployment.md).
4. Run the [QA checklist](../workflows/qa-checklist.md) for the affected cards and gameplay surfaces.
5. Draft public-facing notes with [Pretty Patch Notes](../tools/pretty-patch-notes.md).
6. Publish or schedule the related release communication through the current content workflow.
7. If the patch lands on `release`, complete the [Merge-Back Release to Master](../workflows/merge-back-release-to-master.md).

## Outputs

- shipped gameplay change on `release`
- validated asset and migration changes if required
- player-facing patch notes or blog post
