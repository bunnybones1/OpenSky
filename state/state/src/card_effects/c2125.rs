use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);

    for _ in 0..3 {
      let blight = game.create_card(enemy(owner), BaseCard::C20064).await;
      game.move_to_zone(blight, Zone::Deck).await;
    }
  }))
  .into()],
  on_play: None
});
