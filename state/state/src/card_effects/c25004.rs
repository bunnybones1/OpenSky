use super::effect_helpers::*;

attachable_effect!(
  struct LotusEnlightened(u32);,
  LOTUSENLIGHTENED,
  Effect::Unit {
    on_play: None,
    triggers: vec![]
  }
);

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        let max_mana: u32 = game.player(owner).max_mana.into();

        if let Ok(ResolvedPhaseChangeMaxMana { player, .. }) = phase.try_into() {
          if player != owner {
            return;
          }

          let hero_id = game.hero_id(owner);

          let highest_observed_max_mana = game
            .hero(owner)
            .effects
            .iter()
            .find_map(|m| match m {
              CardEffect::LotusEnlightened(highest_observed_max_mana) => {
                Some(*highest_observed_max_mana)
              }
              _ => None,
            })
            .unwrap_or(0);

          let ability_max_counters = game
            .reveal_from_card(my_id, |c| c.max_counters)
            .await
            .unwrap();

          let mut curr_counters = highest_observed_max_mana;
          while curr_counters < max_mana {
            curr_counters += 1;
            let display_counters = SaturatingU8::from(curr_counters) % ability_max_counters;
            // now always trigger the update
            game
              .modify_card_single(my_id, Modifier::ModifyCounters(1))
              .await;
            // if we tick over to X/Y where X = Y, reset to 0, but fire an event first.
            if display_counters == 0 && curr_counters != 0 {
              game
                .modify_card_single(
                  my_id,
                  Modifier::ModifyCounters(-i8::from(ability_max_counters)),
                )
                .await;

              game
                .run_instant_trigger(BaseCard::C25004, my_id, EffectType::Generic, move |game| {
                  Box::pin(async move {
                    game
                      .modify_card_single(hero_id, Modifier::ModifyHealth(3, None))
                      .await;
                    game.draw_any_card(owner).await;
                  })
                })
                .await;
            }
          }
          game.remove_modifiers_from_source(hero_id, my_id).await;
          game
            .add_modifier(
              hero_id,
              my_id,
              Modifier::GrantEffect(CardEffect::LotusEnlightened(curr_counters)),
              false,
              0,
            )
            .await;
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});
