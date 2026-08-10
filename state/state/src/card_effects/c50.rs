use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let all_units = game.all_units();
        game.damage_many(&all_units, 2, my_id).await;

        let hand_cards = game.hand_cards(owner);
        let has_fire_card_in_hand = game
          .reveal_if_any(hand_cards, |card| card.element == Element::Fire)
          .await;

        if has_fire_card_in_hand {
          let all_units = game.all_units();
          game.give_spell_many(&all_units, enchant::FLAMES).await;
        }
      })
    },
  }
});
