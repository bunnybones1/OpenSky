use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          let stored_card: StoredCard = game
            .reveal_from_card(my_id, |c| StoredCard {
              owner: c.owner,
              card: (*c.base(), c.exact_copy_card_state()),
              attachment: c.attachment.map(|a| (*a.base(), a.exact_copy_card_state())),
            })
            .await;
          let hero = game.hero_id(owner);
          if game.dust(my_id).await {
            game
              .grant_modifier_for_turns(
                hero,
                my_id,
                Modifier::StoredCard(Box::new(stored_card)),
                0,
                2,
              )
              .await;
            game
              .grant_modifier_for_turns(
                hero,
                my_id,
                Modifier::GrantEffect(CardEffect::ReefDiver(my_id)),
                0,
                2,
              )
              .await;
          }
        })
      },
    }
  }))
});

attachable_effect!(
  struct ReefDiver(InstanceID);,
  REEFDIVER,
  Effect::Unit {
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: |_, _| true,
      run: |game, queue, my_id, phase, card_effect| Box::pin(async move {
        if let (Ok(ResolvedPhaseStartTurn { player, .. }), CardEffect::ReefDiver(id)) =
          (phase.try_into(), card_effect)
        {
          let owner = game.owner(my_id);
          if player != owner {
            return;
          }
          let stored_cards: Vec<Box<StoredCard>> = game
            .reveal_from_card(my_id, move |c| {
              c.temporary_modifiers
                .iter()
                .filter_map(|m| {
                  if let Modifier::StoredCard(card) = &m.modifier {
                    if m.source == id {
                      Some(card.clone())
                    } else {
                      None
                    }
                  } else {
                    None
                  }
                })
                .collect_vec()
            })
            .await;
          queue.add_resolution(move |game| {
            Box::pin(async move {
              for card in stored_cards {
                if game.player_has_room_for_unit(card.owner) {
                  let id = game.create_card_from_stored_card(*card).await;
                  game
                    .modify_card_single(id, Modifier::GrantTrait(Trait::Dash))
                    .await;
                  game.summon(id).await;
                }
              }
            })
          })
        }
      })
    }
    .into()],
    on_play: None
  }
);
