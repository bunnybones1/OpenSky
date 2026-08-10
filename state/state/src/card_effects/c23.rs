use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    tiamat_effect(game, my_id).await;
  }))
  .into(),],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, _owner| {
        Box::pin(async move {
          tiamat_effect(game, my_id).await;
        })
      },
    }
  }))
});

async fn tiamat_effect(game: &mut LiveGame<'_>, my_id: InstanceID) {
  let owner = game.owner(my_id);

  let mut previous_enemies = vec![];
  for _ in 0..3 {
    let random_enemies: Vec<InstanceID> = game
      .enemy_field(owner)
      .into_iter()
      .filter(|c| !previous_enemies.contains(c))
      .collect();
    if let Some(dmged_enemy) = game.smart_random_damage(random_enemies, 3, my_id).await {
      previous_enemies.push(dmged_enemy);
    }
  }
  let ids_to_dust: Vec<Card> = game
    .units_including_dead::<&CardInstance<SkyWeaver>>(enemy(owner))
    .into_iter()
    .filter(|c| c.marked_for_death.is_some())
    .map_into()
    .collect();

  game.dust_many(ids_to_dust).await;
}
