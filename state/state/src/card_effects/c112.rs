use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);
    let has_7c_or_higher_card_in_hand = game.reveal_if_any(hand_cards, |card| card.cost >= 7).await;
    if has_7c_or_higher_card_in_hand {
      game
        .modify_card_single(my_id, Modifier::GrantTrait(Trait::Dash))
        .await;
      let hand_card = game.create_card(owner, BaseCard::C2034).await;
      game
        .move_to_zone(hand_card, Zone::Hand { public: true })
        .await;
    }
  }))
  .into()],
  on_play: None
});
