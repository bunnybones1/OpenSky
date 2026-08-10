use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, _, owner| {
        Box::pin(async move {
          let dead_allies = game
            .player(owner)
            .this_turn_stats
            .allies_died
            .clone()
            .into_iter()
            .rev()
            .collect_vec();
          for ally in dead_allies {
            if game.player_has_room_for_unit(owner) {
              game.summon(ally).await;
            }
          }
        })
      },
    }
  }))
});
