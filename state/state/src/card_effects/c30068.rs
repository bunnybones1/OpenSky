use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        let all_units: Vec<InstanceID> = game.all_units();
        game.kill_many(all_units).await;
        game.cleanup_dead_units().await;
        for player in &[game.current_player, enemy(game.current_player)] {
          game.instantiate_and_summon(*player, BaseCard::C20003).await;
        }
        for player in &[game.current_player, enemy(game.current_player)] {
          for _ in 0..2 {
            let c = game.create_card(*player, BaseCard::C30074).await;
            super::c30074::set_to_random_element(game, c).await;
            game.move_to_zone(c, Zone::Hand { public: true }).await;
          }
        }
      })
    },
  }
});
