use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let card = game
          .draw_high_cost(owner, (owner, Zone::Hand { public: false }), |c, _| {
            c.is_unit()
          })
          .await;
        if let Some(card) = card {
          game
            .modify_card_single(card, Modifier::ModifyCost(-2))
            .await;
        }
      })
    },
  }
});
