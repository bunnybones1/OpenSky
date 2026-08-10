use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let damage = 6;
        let units_to_damage = game.all_units_including_dead();
        game.damage_many(&units_to_damage, damage, my_id).await;
        for id in units_to_damage {
          if game
            .reveal_from_card(id, |c| c.marked_for_death.is_some())
            .await
          {
            game.move_to_zone(id, Zone::Deck).await;
          }
        }
      })
    },
  }
});
