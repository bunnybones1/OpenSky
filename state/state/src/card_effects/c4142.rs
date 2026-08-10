use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| {
        Box::pin(async move {
          let n_spell_to_add =
            game.game_params.max_hand_size - game.player_cards(owner).hand().len() as u16;
          let num_spells_left_over = 10 - n_spell_to_add;
          let enemy_hero_id = game.hero_id(enemy(owner));
          let mut spells: Vec<Card> = Vec::new();
          for _ in 0..n_spell_to_add {
            let card = game.create_card(owner, BaseCard::C4157).await;
            spells.push(card.into());
          }

          game
            .move_to_zone_many(spells, Zone::Hand { public: true })
            .await;
          let mut spells_to_cast: Vec<InstanceID> = Vec::new();
          for _ in 0..num_spells_left_over {
            let card = game.create_card(owner, BaseCard::C4157).await;
            game.move_to_zone(card, Zone::Casting).await;
            spells_to_cast.push(card);
          }
          for card in spells_to_cast.iter() {
            game
              .resolve_card_effect_as_unit(*card, Some(enemy_hero_id), 0.into())
              .await;
            if game.reveal_from_card(card, |c| c.zone.is_casting()).await {
              game.move_to_zone(card, Zone::Graveyard).await;
            }
          }
        })
      },
    }
  ))
});
