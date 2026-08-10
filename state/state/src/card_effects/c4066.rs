use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let drawn = game
          .draw_low_cost(owner, (owner, Zone::Hand { public: false }), |c, _| {
            c.is_unit()
          })
          .await;
        if let Some(drawn) = drawn {
          game
            .modify_card(drawn, vec![Modifier::ModifyCost(-1)])
            .await;
        }
      })
    },
  }
});
