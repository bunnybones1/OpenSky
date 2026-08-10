use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let enemy = enemy(game.owner(my_id));
    let card = game.create_card(enemy, BaseCard::C20013).await;
    game.move_to_zone(card, Zone::Deck).await;
  }))
  .into()],
  on_play: None
});
