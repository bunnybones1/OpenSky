# Card Patch Tool

The card patch tool helps reconcile card text changes in design data with the corresponding Rust effect implementations in `state/`.

## Purpose

When card text changes, the tool helps identify which cards now have gameplay text that no longer matches the current Rust logic. That keeps balance and design updates from silently drifting away from the match engine.

## Typical Flow

1. Change card data in the committed design-data or sheets workflow.
2. Run the patch helper from `state/cards`.
3. Inspect which card texts changed and whether those changes require Rust effect updates.
4. Update the relevant effect implementations in `state/state/src/card_effects/`.
5. Rebuild generated artifacts and validate the result in the local stack.

## Example

### Card text

`design-data/raw/sheets/cards/1020/text`

> `{trigger:Play:} Do {3dmg} to target enemy.`

### Matching Rust implementation

`state/state/src/c1020.rs`

```rust
use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.damage(target, 3, my_id).await;
          }
        })
      },
    }
  }))
});
```

## Related Docs

- [state/README.md](../../state/README.md)
- [Card Patch Workflow](../workflows/card-patch-workflow.md)
