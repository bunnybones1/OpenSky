use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, _my_id, target, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let hero_id = game.hero_id(owner);
          if game
            .reveal_from_card(target, |c| c.marked_for_death.is_none())
            .await
          {
            game.fight(hero_id, target).await;
          }
        }
      })
    },
  }
});
