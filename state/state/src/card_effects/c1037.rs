use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let for_deck = game.create_card(enemy(owner), BaseCard::C20029).await;
    game.move_to_zone(for_deck, Zone::Deck).await;
  }))
  .into()],
  on_play: None
});
