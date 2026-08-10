use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C3167, |c| c.is_unit()
  && is_shroom(c.base()));

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.add_global_modifier(
          owner,
          my_id,
          vec![
            Modifier::ModifyPower(2, None),
            Modifier::ModifyHealth(1, None),
          ],
          SerializableFilter::C3167,
        );
        game.instantiate_and_summon(owner, BaseCard::C3000).await;
      })
    },
  }
});
