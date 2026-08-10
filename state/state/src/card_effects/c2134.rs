use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        let num_repeats = 1
          + game
            .hero(owner)
            .effects
            .iter()
            .find_map(|m| match m {
              CardEffect::InfinitieInfinitiesTracker(cast_count) => Some(cast_count),
              _ => None,
            })
            .unwrap_or(&0);
        for _ in 0..num_repeats {
          game.change_max_mana(owner, 1).await;
        }
        game
          .game
          .modify_card(hero, |mut c| {
            c.remove_modifier(|c| {
              matches!(
                c,
                &TemporaryModifier {
                  modifier: Modifier::GrantEffect(CardEffect::InfinitieInfinitiesTracker(_)),
                  ..
                }
              )
            });
          })
          .await;
        game
          .add_modifier(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::InfinitieInfinitiesTracker(num_repeats)),
            false,
            0,
          )
          .await;
        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::InfiniteInfinities(my_id)),
            0,
            1,
          )
          .await;
      })
    },
  }
});

attachable_effect!(
  struct InfiniteInfinities(InstanceID);,
  INFINITEINFINITIES,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: |zone, _| zone.is_field(),
      run: |game, _, _, phase, card_effect| Box::pin(async move {
        if let (Ok(ResolvedPhaseEndTurn { .. }), CardEffect::InfiniteInfinities(id)) =
          (phase.try_into(), card_effect)
        {
          if game.reveal_from_card(id, |c| c.zone.is_graveyard()).await {
            game.move_to_zone(id, Zone::Deck).await;
          }
        }
      })
    }
    .into()]
  }
);
attachable_effect!(
  struct InfinitieInfinitiesTracker(u8);,
  INFINITEINFINITIESTRACKER,
  Effect::Spell {
    on_play: OnPlayEffect::None,
    triggers: vec![]
  }
);
