use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for unit in game.enemy_units::<InstanceID>(owner) {
          game
            .modify_card(unit, vec![Modifier::SetPower(1.into())])
            .await;
        }
      })
    },
  }
});
