use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          let max_mana: u32 = game.player(owner).max_mana.into();
          let amt = 1 + ((max_mana as f32 / 5.).floor()) as i8;
          let hero_id = game.hero_id(owner);
          let enemies = game
            .enemy_field::<&CardInstance<SkyWeaver>>(owner)
            .iter()
            .map(|c| c.id())
            .collect_vec();
          for _ in 0..amt {
            // game.damage_many(&enemies, 1, my_id).await;
            game
              .run_parallel(
                enemies
                  .clone()
                  .into_iter()
                  .filter(|c| c != &my_id)
                  .map_into::<Card>()
                  .flat_map(|card| {
                    many![PhaseModifyCard {
                      card,
                      modifier: Modifier::ModifyHealth(-1, None).clone(),
                      source: my_id
                    },]
                  })
                  .collect(),
              )
              .await;
            game
              .modify_card_single(hero_id, Modifier::ModifyHealth(1, None))
              .await;
            game.draw_any_card(owner).await;
          }
        })
      },
    }
  ))
});
