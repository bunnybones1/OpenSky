use std::cmp::max;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _my_id, target, _| {
      Box::pin(async move {
        let power: i8 = game.reveal_from_card(target, |c| c.power.into()).await;
        game
          .modify_card_single(target, Modifier::SetPower(1.into()))
          .await;
        game
          .modify_card_single(target, Modifier::ModifyHealth(max(0, power - 1), None))
          .await;
      })
    },
  }
});
