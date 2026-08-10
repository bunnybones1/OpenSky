use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let blades = [
          BaseCard::C37,
          BaseCard::C82,
          BaseCard::C87,
          BaseCard::C132,
          BaseCard::C182,
          BaseCard::C183,
          BaseCard::C1000,
          BaseCard::C1027,
        ];
        let mut rng = game.context().random().await;
        let random_blade = blades.iter().choose(&mut rng).unwrap();
        let created_card = game.create_card(owner, *random_blade).await;
        game
          .move_to_zone(created_card, Zone::Hand { public: true })
          .await;

        let hero_id = game.hero_id(owner);
        game
          .move_to_zone(
            my_id,
            Zone::Attachment {
              parent: hero_id.into(),
            },
          )
          .await;
        game.modify_card(my_id, vec![Modifier::ModifyCost(1)]).await;
      })
    },
  }
});
