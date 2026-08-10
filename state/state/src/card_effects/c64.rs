use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let spell = game
          .draw(owner, |c, _| c.is_spell() && c.element == Element::Metal)
          .await;
        let unit = game
          .draw(owner, |c, _| c.is_unit() && c.element == Element::Metal)
          .await;
        if let Some(spell) = spell {
          game
            .modify_card(spell, vec![Modifier::ModifyCost(-1)])
            .await;
        }
        if let Some(unit) = unit {
          game.modify_card(unit, vec![Modifier::ModifyCost(-1)]).await;
        }
      })
    },
  }
});
