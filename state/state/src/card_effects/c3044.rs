use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        let enemy = game
          .lowest_health_character(enemy(owner), |c| c.is_unit())
          .await;
        if let Some(randomly_selected_enemy) = enemy {
          game.damage(randomly_selected_enemy, 4, my_id).await;
        }
      })
    },
  }
});
