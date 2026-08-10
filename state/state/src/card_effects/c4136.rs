use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let num_spells_cast = game
          .player(owner)
          .this_turn_stats
          .base_cards_played
          .iter()
          .filter(|c| c.instance().is_spell())
          .count() as i8;
        game.berf(my_id, num_spells_cast, num_spells_cast).await;
      })
    }
  ))
});
