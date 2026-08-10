use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let num_air_cards_in_hand = game
      .player_cards(owner)
      .hand()
      .iter()
      .flatten()
      .filter(|c| c.instance(game, None).unwrap().element == Element::Air)
      .count()
      + game
        .context
        .reveal_unique(
          owner,
          move |secret| {
            secret
              .hand()
              .iter()
              .flatten()
              .filter(|c| secret.instance(*c).unwrap().element == Element::Air)
              .count()
          },
          |_| true,
        )
        .await;
    for _ in 0..num_air_cards_in_hand {
      let created = game.create_card(owner, BaseCard::C1026).await;
      game.give_spell(created, enchant::FATE).await;
      game.move_to_zone(created, Zone::Deck).await;
    }
  }))
  .into()],
  on_play: None
});
