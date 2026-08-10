use super::effect_helpers::*;
serializable_filter!(SerializableFilter::C131, |c| is_armis_guard(*c.base()));

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        for _ in 0..5 {
          game.instantiate_and_summon(owner, BaseCard::C20001).await;
        }
        game.add_global_modifier(
          owner,
          my_id,
          vec![
            Modifier::ModifyHealth(1, None),
            Modifier::ModifyPower(1, None),
            Modifier::GrantTrait(Trait::Dash),
          ],
          SerializableFilter::C131,
        );
      })
    }
  ))
});
