use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        game.cleanup_dead_units().await;
        let drawn_card = game.draw_into_play(owner, |c, _| c.cost == 2).await;
        if let Some(drawn_card) = drawn_card {
          game.give_spell(drawn_card, enchant::SHROUD).await;
        }
      })
    },
  }
});
