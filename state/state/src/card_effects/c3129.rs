use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let cost: u8 = my_id.instance(game, None).unwrap().cost.into();

        for _ in 0..cost {
          if game.player_has_room_for_unit(owner) {
            let zomboid: InstanceID = game
              .instantiate_and_summon(owner, BaseCard::C20013)
              .await
              .unwrap();

            if cost >= 7 {
              game.berf(zomboid, 3, 3).await;
            }
          }
        }

        game
          .modify_card_single(my_id, Modifier::ModifyCost(1))
          .await;
        if cost < 7 {
          game.move_to_zone(my_id, Zone::Deck).await;
        }
      })
    },
  }
});
