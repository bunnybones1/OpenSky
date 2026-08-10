use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    let mut rng = game.context().random().await;
    let enemies = game.field_cards(enemy(owner)).clone();
    let allies = game.field_cards(owner).clone();
    let ally_units = game.units::<InstanceID>(owner).clone();
    let mut picked_options = vec![];
    for _ in 0..2 {
      let mut r = rng.gen_range(0..=3);
      while picked_options.contains(&r) {
        r = rng.gen_range(0..=3);
      }
      match r {
        0 => {
          game.damage_many(&enemies.clone(), 1, my_id).await;
        }
        1 => {
          game
            .run_parallel(
              allies
                .clone()
                .into_iter()
                .flat_map(|card| {
                  vec![PhaseModifyCard {
                    card: card.into(),
                    modifier: Modifier::ModifyHealth(1, None),
                    source: my_id,
                  }]
                })
                .collect(),
            )
            .await;
        }
        2 => {
          game
            .run_parallel(
              ally_units
                .clone()
                .into_iter()
                .flat_map(|card| {
                  vec![PhaseModifyCard {
                    card: card.into(),
                    modifier: Modifier::ModifyPower(1, None),
                    source: my_id,
                  }]
                })
                .collect(),
            )
            .await;
        }
        3 => {
          game.draw_any_card(owner).await;
        }
        _ => unreachable!(),
      }
      picked_options.push(r);
    }
  }))
  .into()],
  on_play: None
});
