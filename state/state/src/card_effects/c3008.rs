use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let damage = 3;
        let units_to_damage = game.all_units_including_dead();
        game.damage_many(&units_to_damage, damage, my_id).await;
        let owners: IndexSet<_> = units_to_damage
          .into_iter()
          .filter(|c| {
            // This unwrap_revealed is safe because we only
            // call the death cleanup after the effect is done,
            // so all these enemies are still on the field
            c.instance(game, None).unwrap().marked_for_death.is_some()
          })
          .map(|c| game.owner(c))
          .collect();

        // force death cleanup so there's room to summon
        game.cleanup_dead_units().await;
        for owner in owners {
          for _ in 0..2 {
            game
              .instantiate_and_run_and_summon(owner, BaseCard::C20003, |game, card| {
                Box::pin(async move {
                  game.give_spell(card, enchant::FLAMES).await;
                })
              })
              .await;
          }
        }
      })
    },
  }
});
