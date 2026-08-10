use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let num_cards_in_hand = game.player_cards(owner).hand().len();

        let damage = SaturatingU8::from(1);
        let enemy_player = enemy(owner);
        let targets_to_damage = game.units(enemy_player);
        game
          .smart_random_decrease_hp(damage, targets_to_damage.clone())
          .await;
        for _ in 0..num_cards_in_hand {
          game
            .smart_random_decrease_hp(damage, targets_to_damage.clone())
            .await;
        }
      })
    },
  }
});
