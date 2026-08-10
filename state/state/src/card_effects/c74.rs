use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let n_zomboids = game.game_params.max_hand_size - game.player_cards(owner).hand().len() as u16;
    let mut zomboids: Vec<Card> = Vec::new();
    for _ in 0..n_zomboids {
      let card = game.create_card(owner, BaseCard::C20013).await;
      game
        .modify_card(card, vec![Modifier::GrantTrait(Trait::Guard)])
        .await;
      zomboids.push(card.into());
    }

    game
      .move_to_zone_many(zomboids, Zone::Hand { public: true })
      .await;
  }))
  .into()],
  on_play: None
});
