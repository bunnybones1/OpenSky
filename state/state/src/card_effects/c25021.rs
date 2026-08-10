use crate::card_effects::c25014::mercurial_effect;

use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![mercurial_effect().into()],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hand_cards = game.hand_cards(owner);
        let mut random = game.context().random().await;
        let filtered_hand = game.filter_cards(hand_cards, |c| c.cost > 0).await;
        let picked_card = filtered_hand
          .iter()
          .choose(&mut random);
        if let Some(picked_card) = picked_card {
          game
            .run(PhaseModifyCard {
              card: *picked_card,
              modifier: Modifier::ModifyCost(-1),
              source: my_id,
            })
            .await;
        }
      })
    },
  }
});
