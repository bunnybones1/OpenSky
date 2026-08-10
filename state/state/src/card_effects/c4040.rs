use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        let mut spells: Vec<InstanceID> = Vec::new();
        for _ in 0..6 {
          let card = game.create_card(owner, BaseCard::C2006).await;
          spells.push(card);
        }
        game
          .move_to_zone_many(
            spells.clone().into_iter().map_into().collect_vec(),
            Zone::Casting,
          )
          .await;

        let mut rng = game.context().random().await;
        let mut spells_to_move_to_hand: Vec<Card> = Vec::new();
        for spell in spells {
          if let Some(random_enemy_unit) = game
            .units::<&CardInstance<SkyWeaver>>(enemy(owner))
            .iter()
            .filter(|c| !c.effects.contains(&CardEffect::Shroud))
            .collect_vec()
            .choose(&mut rng)
          {
            game
              .resolve_card_effect_as_unit(spell, Some(random_enemy_unit.id()), 0.into())
              .await;
            if game.reveal_from_card(spell, |c| c.zone.is_casting()).await {
              game.move_to_zone(spell, Zone::Graveyard).await;
            }
          } else {
            spells_to_move_to_hand.push(spell.into());
          }
        }

        game
          .move_to_zone_many(spells_to_move_to_hand, Zone::Hand { public: true })
          .await;
      })
    },
  }
});
