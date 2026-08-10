use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          if game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .iter()
            .filter(|c| c.cost == 1)
            .count()
            >= 7
            && game.player_has_room_for_unit(owner)
          {
            let copy = game.copy_card(my_id, true).await;
            game.summon(copy).await;
          }
        })
      },
    }
  ))
});
