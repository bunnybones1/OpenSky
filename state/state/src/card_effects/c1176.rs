use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let hero_pwr = game.hero(owner).power;
        game
          .damage(target, (hero_pwr * 2 as u8).into(), my_id)
          .await;
      })
    },
  }
});
