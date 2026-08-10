use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let num_elements_in_grave: i8 = game
          .player_cards(owner)
          .graveyard()
          .iter()
          .filter(|id| **id != my_id)
          .map(|c| c.instance(game, None).unwrap().element)
          .unique()
          .count() as i8;
        game
          .berf(my_id, num_elements_in_grave, num_elements_in_grave)
          .await;
      })
    }
  ))
});
