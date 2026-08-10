use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let random_enemy = game.lowest_health_character(enemy(owner), |_| true).await;

        if let Some(unit) = random_enemy {
          game.damage(unit, 3, my_id).await;
          if game
            .reveal_from_card(unit, |c| c.marked_for_death.is_some())
            .await
          {
            game.dust(unit).await;
          }
        }
      })
    },
  }
});
