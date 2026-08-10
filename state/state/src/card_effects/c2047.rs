use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, _my_id, target, owner| {
      Box::pin(async move {
        game.change_health(target, 5).await;
        game.change_max_mana(owner, 1).await;
        game.draw_any_card(owner).await;
      })
    },
  }
});
