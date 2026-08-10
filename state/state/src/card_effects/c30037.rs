use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let ally_units = game.units::<InstanceID>(owner);
        for ally_id in ally_units {
          game
            .modify_card(
              ally_id,
              vec![
                Modifier::ModifyHealth(1, None),
                Modifier::GrantTrait(Trait::Banner),
              ],
            )
            .await;
        }
      })
    },
  }
});
