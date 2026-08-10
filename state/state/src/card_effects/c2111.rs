use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let num_elements_in_grave: i8 = game
      .player_cards(owner)
      .graveyard()
      .iter()
      .filter(|id| **id != my_id)
      .map(|c| c.instance(game, None).unwrap().element)
      .unique()
      .count() as i8;

    let mut rng = game.context().random().await;
    for _ in 0..=num_elements_in_grave {
      let traits_we_have = game.reveal_from_card(my_id, |c| c.traits.clone()).await;
      let traits_to_add = [Trait::Guard, Trait::Dash, Trait::Lifesteal];
      let missing_traits = traits_to_add
        .iter()
        .filter(|t| !traits_we_have.contains(*t))
        .collect_vec();
      if missing_traits.is_empty() || rng.gen::<bool>() {
        game.berf(my_id, 1, 1).await;
      } else {
        let tr = missing_traits.choose(&mut rng).unwrap();
        game
          .modify_card_single(my_id, Modifier::GrantTrait(**tr))
          .await;
      }
    }
  }))
  .into()],
  on_play: None
});
