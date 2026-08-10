use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let num_elements_in_grave: i8 = game
          .player_cards(owner)
          .graveyard()
          .iter()
          .filter(|id| **id != my_id)
          .map(|c| c.instance(game, None).unwrap().element)
          .unique()
          .count() as i8;
        game
          .draw_into_play(owner, move |c, _| c.cost == (1 + num_elements_in_grave))
          .await;
      })
    },
  }
});
