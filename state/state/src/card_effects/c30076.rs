use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        // Super-dust all units
        let all_units_attachments: Vec<InstanceID> = game
          .all_units::<&CardInstance<SkyWeaver>>()
          .into_iter()
          .filter_map(|c| c.attachment())
          .collect();
        for attach in all_units_attachments {
          game
            .move_to_zone(attach, Zone::Limbo { public: true })
            .await;
          game.dust(attach).await;
        }
        let all_units = game.all_units();
        game.dust_many(all_units).await;

        // Summon some random unit
        let card = game
          .instantiate_and_summon(0, BaseCard::C20000)
          .await
          .unwrap();
        game.bounce(card).await;

        game.move_to_zone(card, Zone::Deck).await;
        game.move_to_zone(card, Zone::Hand { public: false }).await;
        game.move_to_zone(card, Zone::Graveyard).await;
        game.move_to_zone(card, Zone::Hand { public: true }).await;
        game.move_to_zone(card, Zone::Field).await;
        game.move_to_zone(card, Zone::Hand { public: true }).await;
        game.move_to_zone(card, Zone::Casting).await;
        game.move_to_zone(card, Zone::Hand { public: true }).await;
        game.dust(card).await;
      })
    },
  }
});
