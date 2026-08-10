# Writing Card Effects

This file describes the current shape of card-effect code in `state`.
For the full patch flow, start with:

- [Card Patch Workflow](../../docs/workflows/card-patch-workflow.md)
- [Build State WASMs](../../docs/workflows/build-state.md)
- [Update Card Library in DB](../../docs/workflows/update-card-library-in-db.md)

## File location

Card effects live under:

```text
state/state/src/card_effects/c<ID>.rs
```

Example:

```text
state/state/src/card_effects/c1000.rs
```

## Current pattern

Most card effects use `intrinsic_effect!` plus helpers from `effect_helpers`.

```rust
use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::GrantTrait(Trait::Wither),
              Modifier::ModifyPower(2, None),
              Modifier::ModifyHealth(1, None),
            ],
          )
          .await;
      })
    },
  }
});
```

## Workflow

1. Use `state/cards` patch tooling to find changed card text.
2. Add or update the matching `c<ID>.rs` effect file.
3. Rebuild `state/js-bindings`.
4. Regenerate the card-library SQL.
5. Validate the change in the local stack.

## Practical notes

- `game` methods that are async must be awaited.
- Reuse existing helpers in `effect_helpers` and nearby card files before inventing new patterns.
- Match the effect type to the card: `Spell`, `Unit`, `HeroAbility`, and so on.
- `OnPlayEffect` commonly uses `Targeted`, `MaybeTargeted`, `Untargeted`, or `None`.
- When you need an example, find an existing card with similar text and copy its structure first.

## Good places to look

- `state/state/src/card_effects/c1000.rs`
- `state/state/src/card_effects/c1096.rs`
- `state/state/src/card_effects/c1160.rs`
- `state/state/src/effects.rs`
- `state/state/src/effect_macros.rs`
