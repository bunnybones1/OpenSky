use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = enemy(owner);
    game.change_mana_next_turn(enemy, -1, my_id).await;
    let card = game.create_card(enemy, BaseCard::C20029).await;
    game.move_to_zone(card, Zone::Deck).await;
  }))
  .into()],
  on_play: None
});
