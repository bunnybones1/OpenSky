use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let enemy_hand = game.hand_cards(enemy(owner));
        for card in enemy_hand.clone() {
          game.modify_card(card, vec![Modifier::ModifyCost(-1)]).await;
        }
        for card in enemy_hand {
          let id = game
            .reveal_card(card)
            .await
            .expect("Revealed cards have public IDs");
          let clone = game.copy_card(id, true).await;
          game
            .run(PhaseMoveToZone {
              card: clone,
              player: owner,
              zone: Zone::Hand { public: true },
            })
            .await;
        }
      })
    },
  }
});
