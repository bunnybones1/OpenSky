use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let n_zomboids = game.game_params.max_hand_size - game.player_cards(owner).hand().len() as u16;
    let mut zomboids: Vec<Card> = Vec::new();

    for _ in 0..n_zomboids {
      zomboids.push(game.create_card(owner, BaseCard::C30025).await.into());
    }

    game
      .move_to_zone_many(zomboids, Zone::Hand { public: true })
      .await;
  }))
  .into()],
  on_play: None
});
