use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .draw_low_cost_spell_onto(my_id, |c, _| c.element == Element::Fire)
      .await;

    let hand_cards = game.hand_cards(owner);
    let has_fire_card_in_hand = game
      .reveal_if_any(hand_cards, |card| card.element == Element::Fire)
      .await;
    if has_fire_card_in_hand {
      game.ready(my_id).await;
    }
  }))
  .into()],
  on_play: None
});
