use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);

        let units_to_damage = game.all_units();
        game
          .damage_many(&units_to_damage, 3.try_into().unwrap(), my_id)
          .await;
        for id in units_to_damage {
          if game
            .reveal_from_card(id, |c| c.marked_for_death.is_some())
            .await
          {
            let blight = game.create_card(enemy(owner), BaseCard::C20064).await;
            game.move_to_zone(blight, Zone::Deck).await;
          }
        }
      })
    },
  }
});
