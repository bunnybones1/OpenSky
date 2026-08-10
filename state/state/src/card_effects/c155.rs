use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        while game.player_has_room_for_unit(owner) {
          game.instantiate_and_summon(owner, BaseCard::C138).await;
        }
        let other_ally_units = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.id() != my_id)
          .map_into::<Card>()
          .collect_vec();
        game
          .run_parallel(
            other_ally_units
              .clone()
              .into_iter()
              .flat_map(|card| {
                many![
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyPower(2, None),
                    source: my_id,
                  },
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyHealth(2, None),
                    source: my_id,
                  }
                ]
              })
              .collect(),
          )
          .await;
      })
    }
  ))
});
