use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, player| {
      Box::pin(async move {
        let conjured = game.draw_into_play(player, |card, _| card.cost == 1).await;
        if let Some(conjured) = conjured {
          game.ready(conjured).await;
        }
      })
    },
  }
});
