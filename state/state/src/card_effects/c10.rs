use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let card = game.draw(owner, |c, _| c.cost == 1 && c.is_unit()).await;

        if let Some(card) = card {
          game.berf(card, 1, 1).await;
        }
      })
    },
  }
});
