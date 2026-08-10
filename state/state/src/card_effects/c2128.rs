use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
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
          .berf(target, num_elements_in_grave, num_elements_in_grave)
          .await;
      })
    },
  }
});
