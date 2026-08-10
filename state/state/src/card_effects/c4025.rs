use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        if let Some(max_cost) = game
          .high_cost_in_pool(
            owner,
            |c, _| c.is_spell(),
            CardPool::Anywhere,
            Zone::Hand { public: false },
          )
          .await
        {
          let drawn_card = game
            .draw(owner, move |c, _| c.cost == max_cost && c.is_spell())
            .await;
          if let Some(drawn_card) = drawn_card {
            game
              .modify_card(drawn_card, vec![Modifier::ModifyCost(-2)])
              .await;
          }
        }
      })
    },
  }
});
