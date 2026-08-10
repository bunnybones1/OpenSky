use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;

        let enemy = enemy(owner);
        for _ in 0..2 {
          game.reveal_random_hand_card(enemy).await;
        }
      })
    }
  }
});
