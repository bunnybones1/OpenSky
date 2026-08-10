use super::effect_helpers::*;

// Cards get buff one time when entering field
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.add_global_modifier(
          owner,
          my_id,
          vec![Modifier::GrantTrait(Trait::Armor)],
          SerializableFilter::C30101,
        );
      })
    },
  }
});
