use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
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

        // Fill the field with Elderwood *with flames* with +1/+1
        for player in &[owner, enemy(owner)] {
          for _ in 0..game.game_params.max_board_units {
            game
              .instantiate_and_run_and_summon(*player, BaseCard::C20003, |game, id| {
                Box::pin(async move {
                  game.give_spell(id, enchant::FLAMES).await;
                  game.berf(id, 1, 1).await;
                })
              })
              .await;
          }
        }

        let all_units: Vec<InstanceID> = game.all_units();
        let all_units_cards: Vec<Card> = all_units.iter().copied().map_into().collect();

        // Give them all Frozen
        game
          .give_spell_many(&all_units_cards, enchant::FROSTBITE)
          .await;

        // Give them all Dazed
        game.give_spell_many(&all_units_cards, enchant::DAZED).await;

        // Give them all Stealth
        for unit in &all_units {
          game
            .modify_card(*unit, vec![Modifier::GrantTrait(Trait::Stealth)])
            .await;
        }

        // Give them all Guard
        for unit in &all_units {
          game
            .modify_card(*unit, vec![Modifier::GrantTrait(Trait::Guard)])
            .await;
        }

        // Give them all Armor
        for unit in &all_units {
          game
            .modify_card(*unit, vec![Modifier::GrantTrait(Trait::Armor)])
            .await;
        }

        // Make each of them deal 1 dmg to each other one
        for unit in &all_units {
          game.damage_many(&all_units, 1, *unit).await;
        }

        // Give them all 99hp
        for unit in &all_units {
          game.change_health(*unit, 99).await;
        }

        // Make each of them deal 2dmg to each other one
        for unit in &all_units {
          game.damage_many(&all_units, 2, *unit).await;
        }

        // Deal 99 damage to them each
        let hero = game.hero_id(0);
        game.damage_many(&all_units, 99, hero).await;

        // Move them all from graveyard to deck

        // cleanup deaths
        game.resolve_triggers().await;

        for unit in &all_units {
          game.move_to_zone(*unit, Zone::Deck).await;
        }

        // Give them all "Flames" while in-deck
        game
          .give_spell_many(&all_units_cards, enchant::FLAMES)
          .await;

        // Move all elderwoods from deck to graveyard
        for unit in &all_units {
          game.move_to_zone(*unit, Zone::Graveyard).await;
        }

        // Move all elderwoods from graveyard to hand public false
        for unit in &all_units {
          game.move_to_zone(*unit, Zone::Hand { public: false }).await;
        }

        // Move all elderwoods to hand public true
        for unit in &all_units {
          game.move_to_zone(*unit, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});
