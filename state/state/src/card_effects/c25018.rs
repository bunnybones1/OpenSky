use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let my_hand: Vec<_> = game
            .player_cards(owner)
            .hand()
            .clone()
            .into_iter()
            .enumerate()
            .map(|(index, _c)| game.hand_card(owner, index))
            .collect();
          if my_hand.is_empty() {
            return;
          }
          let mut random = game.context().random().await;
          let picked = my_hand
            .choose(&mut random)
            .expect("Got None from choosing from a non-empty list...");
          game.mulligan_card(picked.into()).await;
        }
      })
    },
  }
});
