use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let player_deck = game.deck_cards(owner);
        let enemy_deck = game.deck_cards(enemy(owner));
        for (card_owner, card) in player_deck
          .into_iter()
          .map(|player_card| (owner, player_card))
          .interleave(
            enemy_deck
              .into_iter()
              .map(|enemy_card| (enemy(owner), enemy_card)),
          )
        {
          game
            .run(PhaseMoveToZone {
              card,
              player: enemy(card_owner),
              zone: Zone::Deck,
            })
            .await;
          game.modify_card(card, vec![Modifier::ModifyCost(-3)]).await;
        }
      })
    },
  }
});
