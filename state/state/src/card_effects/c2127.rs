use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let ally_units = game.player_cards(owner).field();
        game
          .run_parallel(
            ally_units
              .clone()
              .into_iter()
              .flat_map(|card| {
                vec![PhaseModifyCard {
                  card: card.into(),
                  modifier: Modifier::ModifyHealth(2, None),
                  source: my_id,
                }]
              })
              .collect(),
          )
          .await;

        let highest_health = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map(|c| c.health)
          .max();
        if let Some(highest_health) = highest_health {
          game
            .draw_into_play(owner, move |c, _| c.cost == highest_health)
            .await;
        }
      })
    },
  }
});
