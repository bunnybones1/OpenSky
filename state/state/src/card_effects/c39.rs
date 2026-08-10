use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);
    let num_fire_cards_in_hand = game
      .reveal_from_cards_fold(
        hand_cards,
        |c| c.element == Element::Fire,
        0,
        |sum, is_fire| if *is_fire { sum + 1 } else { sum },
      )
      .await;

    for _ in 0..num_fire_cards_in_hand {
      game
        .instantiate_and_run_and_summon(owner, BaseCard::C20026, |game, card| {
          Box::pin(async move {
            game
              .modify_card(card, vec![Modifier::GrantTrait(Trait::Stealth)])
              .await;
          })
        })
        .await;
    }
  }))
  .into()],
  on_play: None
});
