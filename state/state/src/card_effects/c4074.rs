use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let card = game.draw(owner, |c, _| c.element == Element::Mind).await;
          if let Some(card) = card {
            game.modify_card(card, vec![Modifier::ModifyCost(1)]).await;
          }
        }
      })
    },
  }
});
