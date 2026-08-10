use super::effect_helpers::*;

// Wrapped Gift:
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        let current_player = game.current_player;
        let conjured: [[Option<Card>; 2]; 2] = [
          [
            game.conjure(current_player, |_, _| true).await,
            game.conjure(current_player, |_, _| true).await,
          ],
          [
            game.conjure(1 - current_player, |_, _| true).await,
            game.conjure(1 - current_player, |_, _| true).await,
          ],
        ];
        for (i, new_owner) in &[(0usize, 1 - current_player), (1usize, current_player)] {
          if let Some(card) = conjured[*i][0] {
            game
              .run(PhaseMoveToZone {
                card,
                player: *new_owner,
                zone: Zone::Hand { public: true },
              })
              .await;
          }
          if let Some(card) = conjured[*i][1] {
            game
              .run(PhaseMoveToZone {
                card,
                player: *new_owner,
                zone: Zone::Hand { public: true },
              })
              .await;
          }
        }
        for player_cards in &conjured {
          for card in player_cards.iter().flatten() {
            game.modify_card(card, vec![Modifier::ModifyCost(-5)]).await;
          }
        }
      })
    },
  }
});
