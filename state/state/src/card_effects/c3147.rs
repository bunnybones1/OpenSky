use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| {
        Box::pin(async move {
          let dead_units: Vec<_> = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.is_unit())
            .map(|c| c.id())
            .take(5)
            .collect();
          for id in &dead_units {
            if game.player_has_room_for_unit(owner) {
              game
                .modify_card(
                  *id,
                  vec![
                    Modifier::SetPower(1.into()),
                    Modifier::SetHealth(3.into()),
                    Modifier::GrantTrait(Trait::Guard),
                  ],
                )
                .await;
              game.summon(*id).await;
            }
          }
        })
      },
    }
  ))
});
