use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game.damage(target, 2, my_id).await;
        game
          .modify_card_single(hero, Modifier::ModifyHealth(2, None))
          .await;
      })
    },
  }
});
