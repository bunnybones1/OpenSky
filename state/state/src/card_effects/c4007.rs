use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let enemy_units: Vec<_> = game
          .enemy_units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map(|c| {
            let dmg: u8 = c.power.into();
            (c.id(), dmg)
          })
          .collect();

        let mut damage_phases = vec![];
        for (id, power) in &enemy_units {
          damage_phases.push(
            game
              .build_damage(*id, *power, my_id, DamageKind::CardEffect)
              .await,
          );
        }

        game.run_parallel(damage_phases).await;
        let enemy_units = game.enemy_units(owner);
        game.give_spell_many(&enemy_units, enchant::DAZED).await;
      })
    },
  }
});
