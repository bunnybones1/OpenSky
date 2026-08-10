use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let dead_1c: Vec<Card> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.base().instance().cost == 1)
          .map_into()
          .collect();

        let damage = SaturatingU8::from(1);
        let enemy_player = enemy(owner);
        let targets_to_damage = game.characters(enemy_player);
        game
          .smart_random_decrease_hp(damage, targets_to_damage.clone())
          .await;
        for card in dead_1c {
          if game.dust(card).await {
            game
              .smart_random_decrease_hp(damage, targets_to_damage.clone())
              .await;
          }
        }
      })
    },
  }
});
