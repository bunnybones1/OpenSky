use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C30101, |c| is_zomboid(*c.base()));

// Cards get buff one time when entering field
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.add_global_modifier(
          owner,
          my_id,
          vec![
            Modifier::ModifyHealth(1, None),
            Modifier::ModifyPower(1, None),
          ],
          SerializableFilter::C30101,
        );
      })
    },
  }
});
