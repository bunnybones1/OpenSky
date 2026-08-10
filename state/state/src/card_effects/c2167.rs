use card_movement_simulator::CardEvent;

use crate::client::GameAction;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.draw(owner, |c, _| c.is_unit()).await;
        let public_hand_modifiers: Vec<_> = game
          .player_cards(owner)
          .hand()
          .iter()
          .flatten()
          .filter_map(|id| {
            let instance = id.instance(game, None).unwrap();
            if instance.is_unit() {
              Some(PhaseModifyCard {
                card: id.into(),
                modifier: Modifier::SetPower(instance.health.into()),
                source: my_id,
              })
            } else {
              None
            }
          })
          .collect();
        game.run_parallel(public_hand_modifiers).await;

        game.context().mutate_secret(owner, |mut secret| {
          let matching_hand_card: Vec<_> = secret
            .hand()
            .iter()
            .flatten()
            .filter(|c| secret.instance(**c).unwrap().is_unit())
            .copied()
            .collect();
          secret.log(CardEvent::GameEvent {
            event: GameAction::EnterParallelPhases,
          });
          for card in matching_hand_card {
            let instance = secret.instance(card).unwrap();
            secret
              .secret
              .apply_modifier(
                card.into(),
                Modifier::SetPower(instance.health.into()),
                my_id,
                secret.log,
              )
              .unwrap();
          }
          secret.log(CardEvent::GameEvent {
            event: GameAction::ExitParallelPhases,
          });
        });
      })
    },
  }
});
