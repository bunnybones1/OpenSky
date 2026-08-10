use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.give_spell(target, enchant::VAPORS).await;
        game.change_health(target, 2).await;

        let enemy = enemy(owner);
        for _ in 0..2 {
          game.reveal_random_hand_card(enemy).await;
        }
      })
    },
  }
});
